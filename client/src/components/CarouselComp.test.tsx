import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CarouselComp from "./CarouselComp";
import { phoneCarouselMedia } from "../config";

// The home page carousel. The first slide's photo is what visitors see first,
// so it downloads on its own; the hidden slides' photos wait for it instead of
// sharing the connection with it. Phones held upright get a phone-shaped copy
// of each photo (a smaller download showing the same part of the photo).

const slides = [
  { picture: "/winter.jpg", phonePicture: "/winter-phone.jpg", tell: "It is cold.", show: "Frost bit my nose." },
  { picture: "/summer.jpg", phonePicture: "/summer-phone.jpg", tell: "It is hot.", show: "The sand burned my feet." },
  { picture: "/messy.jpg", phonePicture: "/messy-phone.jpg", tell: "It is messy.", show: "Socks covered the floor." },
];

const photos = () => document.querySelectorAll("img.carousel-image");
const sources = () => [...photos()].map((img) => img.getAttribute("src"));
const everyPhoto = ["/winter.jpg", "/summer.jpg", "/messy.jpg"];
// The phone-shaped copies, offered through <picture><source>
const phoneCopies = () =>
  [...document.querySelectorAll("picture > source")].map((source) => source.getAttribute("srcset"));
const everyPhoneCopy = ["/winter-phone.jpg", "/summer-phone.jpg", "/messy-phone.jpg"];

describe("CarouselComp", () => {
  it("shows each slide's sentences", () => {
    render(<CarouselComp sliderdata={slides} />);

    expect(screen.getByText("It is cold.")).toBeInTheDocument();
    expect(screen.getByText("Frost bit my nose.")).toBeInTheDocument();
  });

  it("offers upright phones a phone-shaped copy of each photo", () => {
    render(<CarouselComp sliderdata={slides} />);

    for (const photo of photos()) {
      const picture = photo.parentElement;
      expect(picture.tagName).toBe("PICTURE");
      // The browser uses the first <source> whose media matches, else the <img>
      const source = picture.firstElementChild;
      expect(source.tagName).toBe("SOURCE");
      expect(source.getAttribute("media")).toBe(phoneCarouselMedia);
    }
  });

  it("downloads only the first slide's photo at first", () => {
    render(<CarouselComp sliderdata={slides} />);

    expect(sources()).toEqual(["/winter.jpg", null, null]);
    expect(phoneCopies()).toEqual(["/winter-phone.jpg", null, null]);
  });

  it("downloads the other photos once the first one has arrived", () => {
    render(<CarouselComp sliderdata={slides} />);
    fireEvent.load(photos()[0]);

    expect(sources()).toEqual(everyPhoto);
    expect(phoneCopies()).toEqual(everyPhoneCopy);
  });

  it("still downloads the other photos if the first one fails", () => {
    render(<CarouselComp sliderdata={slides} />);
    fireEvent.error(photos()[0]);

    expect(sources()).toEqual(everyPhoto);
    expect(phoneCopies()).toEqual(everyPhoneCopy);
  });

  it("downloads every photo straight away when the visitor changes slide", () => {
    render(<CarouselComp sliderdata={slides} />);
    fireEvent.click(document.querySelector(".carousel-control-next"));

    expect(sources()).toEqual(everyPhoto);
    expect(phoneCopies()).toEqual(everyPhoneCopy);
  });
});
