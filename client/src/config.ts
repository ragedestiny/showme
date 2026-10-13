// variables for item per page displayed on different pages

export const SentencesPerPageForMyPage = 8;

export const DisplayCollectionSentences = 12;

// Which screens get the phone-shaped copies of the home page photos
// (public/images/*-phone.jpg): phones held upright, at most 480 px wide and at
// least 16:9 tall. There the carousel fills the width and 85% of the height
// (see the phone and tablet rules in public/styles.css), so it shows only the
// middle of each wide photo. The copies are that middle: the same pixels as
// the full photo without its sides, wide enough for the widest such screen,
// so they look exactly the same with fewer bytes (about half). Used by
// CarouselComp and by index.html's early download of the first photo
// (vite.config.ts).
export const phoneCarouselMedia = "(max-width: 480px) and (max-aspect-ratio: 9/16)";
