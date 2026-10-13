import React, { useState } from "react";
import Carousel from "react-bootstrap/Carousel";
import Container from "react-bootstrap/esm/Container";
import { phoneCarouselMedia } from "../config";
import type { Slide } from "../tellData";

function CarouselComp(props: { sliderdata: Slide[] }) {
  // The first slide's photo is the main thing on the home page, so it
  // downloads on its own: the hidden slides' photos wait until it has arrived
  // (or failed) instead of sharing the connection with it. The slides only
  // start turning then, so the next photo still has the usual 5 seconds to
  // arrive. A visitor who changes slide gets every photo straight away.
  // Phones held upright download the phone-shaped copy instead (<source>),
  // which index.html has usually started downloading already (vite.config.ts).
  const [firstPhotoDone, setFirstPhotoDone] = useState(false);
  const loadTheRest = () => setFirstPhotoDone(true);

  // Carousel in front page
  return (
    <Container fluid>
      <Carousel
        className="carousel"
        variant="dark"
        interval={firstPhotoDone ? 5000 : null}
        onSelect={loadTheRest}
      >
        {props.sliderdata.map((entry, index) => {
          const first = index === 0;
          const download = first || firstPhotoDone;
          return (
            // A fixed list that never changes order, and position is what
            // matters here (the first slide loads first)
            // eslint-disable-next-line no-restricted-syntax
            <Carousel.Item key={index}>
              <picture className="d-block">
                <source
                  media={phoneCarouselMedia}
                  srcSet={download ? entry.phonePicture : undefined}
                />
                <img
                  className="d-block w-100 carousel-image"
                  src={download ? entry.picture : undefined}
                  alt={String(index + 1)}
                  fetchPriority={first ? "high" : "low"}
                  onLoad={first ? loadTheRest : undefined}
                  onError={first ? loadTheRest : undefined}
                />
              </picture>
              <Carousel.Caption>
                <h4>{entry.tell}</h4>
                <p className="subtext">Vs.</p>
                <h3>{entry.show}</h3>
              </Carousel.Caption>
            </Carousel.Item>
          );
        })}
      </Carousel>
    </Container>
  );
}

export default CarouselComp;
