import React from "react";
import CarouselComp from "../components/CarouselComp";
import tell from "../tellData";

// Home Page
function Home() {
  return (
    <div className="contenthome">
      <CarouselComp sliderdata={tell} />;
    </div>
  );
}

export default Home;
