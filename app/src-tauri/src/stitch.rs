//! Long screenshot: stitches frames of a scrolled area into one tall image.
//!
//! Pure: no Windows calls, so `cargo test` covers it with synthetic images.
//! Each new frame is compared with the previous one. Rows that stay put at the
//! top and bottom (a fixed header or footer) are kept once. In the rows between,
//! the frame is matched against the previous frame to find how far the content
//! moved up, and only the rows that came into view are added.

/// One grab of the selected area: RGBA, `w * h * 4` bytes.
pub struct Frame {
    pub w: u32,
    pub h: u32,
    pub px: Vec<u8>,
}

/// What one new frame did to the long image.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    /// The content moved up by this many rows, which were added.
    Added(u32),
    /// Nothing moved (end of the page, or the wheel went elsewhere).
    Same,
    /// No overlap with the previous frame: the whole moving band was added
    /// below. The page scrolled further than the area is tall.
    NoOverlap(u32),
    /// The image reached `max_h`; the rest is left out.
    Full,
}

/// Highest share of rows that may differ in an overlap (a blinking cursor,
/// a spinner) and still count as a match.
const TOLERANCE: f64 = 0.03;
/// Fewest rows with content an overlap needs before it is trusted.
const MIN_ROWS: usize = 6;

pub struct Stitcher {
    w: u32,
    h: u32,
    first: Vec<u8>,
    last: Vec<u8>,
    /// Fixed rows at the top and bottom, found at the first scroll.
    fixed: Option<(u32, u32)>,
    /// Rows between header and footer, top to bottom.
    body: Vec<u8>,
    max_h: u32,
    full: bool,
}

impl Stitcher {
    /// Starts with the first frame. `max_h` caps the height of the result
    /// (a browser canvas cannot be taller than 32767 px).
    pub fn new(first: Frame, max_h: u32) -> Self {
        Stitcher {
            w: first.w,
            h: first.h,
            first: first.px.clone(),
            last: first.px,
            fixed: None,
            body: Vec::new(),
            max_h: max_h.max(first.h),
            full: false,
        }
    }

    /// Height of the long image so far.
    pub fn height(&self) -> u32 {
        match self.fixed {
            None => self.h,
            Some((top, bot)) => top + self.body_rows() + bot,
        }
    }

    /// The most recent frame, for the live view.
    pub fn last_frame(&self) -> &[u8] {
        &self.last
    }

    fn row_bytes(&self) -> usize {
        self.w as usize * 4
    }

    fn body_rows(&self) -> u32 {
        (self.body.len() / self.row_bytes()) as u32
    }

    fn row<'a>(&self, px: &'a [u8], y: u32) -> &'a [u8] {
        let rb = self.row_bytes();
        &px[y as usize * rb..(y as usize + 1) * rb]
    }

    /// Adds a frame of the same size as the first.
    pub fn push(&mut self, frame: Frame) -> Step {
        if frame.w != self.w || frame.h != self.h {
            return Step::Same;
        }
        if self.full {
            return Step::Full;
        }
        let cur = frame.px;
        if cur == self.last {
            return Step::Same;
        }

        let (top, bot) = match self.fixed {
            Some(f) => f,
            None => {
                // Rows equal at the same place in both frames: a fixed header
                // and footer. At most a third of the area each.
                let cap = self.h / 3;
                let top = (0..self.h).take_while(|&y| self.row(&self.last, y) == self.row(&cur, y)).count() as u32;
                let bot = (0..self.h).rev().take_while(|&y| self.row(&self.last, y) == self.row(&cur, y)).count() as u32;
                (top.min(cap), bot.min(cap))
            }
        };
        let band = self.h - top - bot;
        let hp = row_hashes(&self.last, self.w, top, band);
        let hc = row_hashes(&cur, self.w, top, band);
        let info: Vec<bool> = (0..band).map(|i| !uniform(self.row(&cur, top + i))).collect();

        let shift = find_shift(&hp, &hc, &info);
        if shift == Some(0) {
            // Only a small part changed (a cursor, a spinner); nothing scrolled.
            self.last = cur;
            return Step::Same;
        }
        if self.fixed.is_none() {
            self.fixed = Some((top, bot));
            let rb = self.row_bytes();
            self.body = self.first[top as usize * rb..(top + band) as usize * rb].to_vec();
        }
        let (add, step) = match shift {
            Some(d) => (d as u32, Step::Added(d as u32)),
            None => (band, Step::NoOverlap(band)),
        };
        // The rows that came into view: the bottom `add` rows of the band.
        let room = self.max_h.saturating_sub(self.height());
        let take = add.min(room);
        let rb = self.row_bytes();
        let from = (top + band - add) as usize * rb;
        self.body.extend_from_slice(&cur[from..from + take as usize * rb]);
        self.last = cur;
        if take < add {
            self.full = true;
            return Step::Full;
        }
        step
    }

    /// The long image: header from the first frame, the stitched body, and
    /// the footer from the last frame. Returns (width, height, RGBA).
    pub fn finish(self) -> (u32, u32, Vec<u8>) {
        let Some((top, bot)) = self.fixed else {
            return (self.w, self.h, self.last);
        };
        let rb = self.row_bytes();
        let h = self.height();
        let mut out = Vec::with_capacity(h as usize * rb);
        out.extend_from_slice(&self.first[..top as usize * rb]);
        out.extend_from_slice(&self.body);
        out.extend_from_slice(&self.last[(self.h - bot) as usize * rb..]);
        (self.w, h, out)
    }
}

/// A fast hash per row, for rows `top..top + n`.
fn row_hashes(px: &[u8], w: u32, top: u32, n: u32) -> Vec<u64> {
    let rb = w as usize * 4;
    (top..top + n)
        .map(|y| {
            let row = &px[y as usize * rb..(y as usize + 1) * rb];
            let mut h: u64 = 0xcbf2_9ce4_8422_2325;
            let mut chunks = row.chunks_exact(8);
            for c in &mut chunks {
                h = (h.rotate_left(5) ^ u64::from_le_bytes(c.try_into().unwrap())).wrapping_mul(0x5851_f42d_4c95_7f2d);
            }
            for &b in chunks.remainder() {
                h = (h.rotate_left(5) ^ b as u64).wrapping_mul(0x5851_f42d_4c95_7f2d);
            }
            h
        })
        .collect()
}

/// A row of one colour says nothing about where it belongs.
fn uniform(row: &[u8]) -> bool {
    row.chunks_exact(4).all(|p| p == &row[..4])
}

/// How many rows the content moved up from `prev` to `cur`: the smallest
/// shift where the rows with content line up (within `TOLERANCE`). `Some(0)`
/// means it did not move. `None` means no overlap was found.
fn find_shift(prev: &[u64], cur: &[u64], info: &[bool]) -> Option<usize> {
    let n = cur.len();
    let mut best: Option<(usize, f64)> = None;
    for d in 0..n {
        let overlap = n - d;
        let rows = info[..overlap].iter().filter(|&&b| b).count();
        if rows < MIN_ROWS {
            break; // larger shifts only have fewer rows to compare
        }
        let allowed = (rows as f64 * TOLERANCE).floor() as usize;
        let mut miss = 0;
        for i in 0..overlap {
            if info[i] && cur[i] != prev[i + d] {
                miss += 1;
                if miss > allowed {
                    break;
                }
            }
        }
        if miss <= allowed {
            let score = miss as f64 / rows as f64;
            if score == 0.0 {
                return Some(d);
            }
            if best.is_none_or(|(_, s)| score < s) {
                best = Some((d, score));
            }
        }
    }
    best.map(|(d, _)| d)
}

#[cfg(test)]
mod tests {
    use super::*;

    const W: u32 = 24;

    /// A colourful row that differs from every other row.
    fn page_row(y: u32) -> Vec<u8> {
        (0..W)
            .flat_map(|x| [(y * 131 % 251) as u8, ((x * 7 + y * 17) % 256) as u8, ((x * y + 3) % 256) as u8, 255])
            .collect()
    }

    fn solid_row(c: u8) -> Vec<u8> {
        [c, c, c, 255].repeat(W as usize)
    }

    /// The area showing page rows `off..off + h - top - bot`, with an optional
    /// fixed header (`top` rows) and footer (`bot` rows) drawn over it.
    fn frame(off: u32, h: u32, top: u32, bot: u32) -> Frame {
        let mut px = Vec::new();
        for y in 0..top {
            px.extend(solid_row(40 + y as u8)); // header: distinct dark rows
        }
        for y in 0..h - top - bot {
            px.extend(page_row(off + y));
        }
        for y in 0..bot {
            px.extend(solid_row(200 + y as u8));
        }
        Frame { w: W, h, px }
    }

    fn page(from: u32, to: u32) -> Vec<u8> {
        (from..to).flat_map(page_row).collect()
    }

    #[test]
    fn plain_scroll_adds_only_new_rows() {
        let mut s = Stitcher::new(frame(0, 60, 0, 0), 10_000);
        assert_eq!(s.push(frame(37, 60, 0, 0)), Step::Added(37));
        assert_eq!(s.push(frame(90, 60, 0, 0)), Step::Added(53));
        assert_eq!(s.push(frame(140, 60, 0, 0)), Step::Added(50));
        let (w, h, px) = s.finish();
        assert_eq!((w, h), (W, 200));
        assert_eq!(px, page(0, 200), "no doubled or missing rows");
    }

    #[test]
    fn sticky_header_and_footer_are_kept_once() {
        let (h, top, bot) = (80, 12, 6);
        let mut s = Stitcher::new(frame(0, h, top, bot), 10_000);
        assert_eq!(s.push(frame(20, h, top, bot)), Step::Added(20));
        assert_eq!(s.push(frame(45, h, top, bot)), Step::Added(25));
        let (_, out_h, px) = s.finish();
        let band = h - top - bot;
        assert_eq!(out_h, top + 45 + band + bot);
        let mut want = Vec::new();
        (0..top).for_each(|y| want.extend(solid_row(40 + y as u8)));
        want.extend(page(0, 45 + band));
        (0..bot).for_each(|y| want.extend(solid_row(200 + y as u8)));
        assert_eq!(px, want);
    }

    #[test]
    fn no_overlap_adds_the_whole_band_below() {
        let mut s = Stitcher::new(frame(0, 40, 0, 0), 10_000);
        assert_eq!(s.push(frame(500, 40, 0, 0)), Step::NoOverlap(40));
        let (_, h, px) = s.finish();
        assert_eq!(h, 80);
        let mut want = page(0, 40);
        want.extend(page(500, 540));
        assert_eq!(px, want);
    }

    #[test]
    fn end_of_page_and_small_changes_add_nothing() {
        let mut s = Stitcher::new(frame(0, 60, 0, 0), 10_000);
        assert_eq!(s.push(frame(30, 60, 0, 0)), Step::Added(30));
        assert_eq!(s.push(frame(30, 60, 0, 0)), Step::Same, "end of the page");
        // A blinking cursor: one row changes, nothing scrolls.
        let mut blink = frame(30, 60, 0, 0);
        blink.px[20 * W as usize * 4] ^= 0xff;
        assert_eq!(s.push(blink), Step::Same);
        assert_eq!(s.finish().1, 90);
    }

    #[test]
    fn blank_rows_do_not_fool_the_match() {
        // A page with white gaps between blocks of text.
        let row = |y: u32| if (y / 10) % 2 == 0 { page_row(y) } else { solid_row(255) };
        let fr = |off: u32| Frame { w: W, h: 50, px: (off..off + 50).flat_map(row).collect() };
        let mut s = Stitcher::new(fr(0), 10_000);
        assert_eq!(s.push(fr(23)), Step::Added(23));
        let (_, h, px) = s.finish();
        assert_eq!(h, 73);
        assert_eq!(px, (0..73).flat_map(row).collect::<Vec<u8>>());
    }

    #[test]
    fn height_is_capped() {
        let mut s = Stitcher::new(frame(0, 60, 0, 0), 100);
        assert_eq!(s.push(frame(30, 60, 0, 0)), Step::Added(30));
        assert_eq!(s.push(frame(60, 60, 0, 0)), Step::Full);
        assert_eq!(s.push(frame(90, 60, 0, 0)), Step::Full);
        let (_, h, px) = s.finish();
        assert_eq!(h, 100);
        assert_eq!(px, page(0, 100));
    }
}
