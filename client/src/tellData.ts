// home page display - static doesn't change
// picture: the photo; phonePicture: its middle, for phones held upright (see
// phoneCarouselMedia in config.ts). Replacing a photo? Replace both.

// One slide of the home page carousel (see CarouselComp)
export interface Slide {
  key: number;
  title: string;
  tell: string;
  show: string;
  picture: string;
  phonePicture: string;
}

const tell: Slide[] = [
  {
    key: 1,
    title: "Day 1",
    tell: "It is cold outside.",
    show: "As I walked out the door, the frigid air hit my face and instantly the sweat on my forehead crystalized.",
    picture: "/images/winter.jpg",
    phonePicture: "/images/winter-phone.jpg",
  },
  {
    key: 2,
    title: "Day 2",
    tell: "It is hot outside.",
    show: "The blazing heat scorches the parched lands eliminating the last bit of moisture trying to escape.",
    picture: "/images/summer.jpg",
    phonePicture: "/images/summer-phone.jpg",
  },
  {
    key: 3,
    title: "Day 3",
    tell: "His room is messy.",
    show: "There are dirty clothes all over the filthy floor and a foul smell from the leftover rotting food envelopes his flat.",
    picture: "/images/messy.jpg",
    phonePicture: "/images/messy-phone.jpg",
  },
  {
    key: 4,
    title: "Day 4",
    tell: "Her room is clean.",
    show: "Even with a magnifying glass, you won't be able to see a minute speck of dust in her spotless apartment.",
    picture: "/images/clean.jpg",
    phonePicture: "/images/clean-phone.jpg",
  },
];

export default tell;
