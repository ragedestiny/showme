import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useOpenLogin } from "../components/loginPopup";

// About page
const About = () => {
  const navigate = useNavigate();
  const openLogin = useOpenLogin();
  const user = useSelector((state) => state.user);

  // Join Us: a signed-in student goes straight to their page; anyone else
  // gets the sign-in pop-up first (signing in then opens their page)
  const join = (event) => {
    event.preventDefault(); // stay in the app: no reload, no "#" in the address
    if (Object.keys(user).length !== 0) navigate("/MyPage");
    else openLogin();
  };

  return (
    <div className="contentmypage">
      <div className="container-fluid bg-dark rounded-3 text-white p-5 about">
        <div className="container bg-dark p-5">
          <h1 className="display-4 fw-bold">Welcome to Show ME!!!</h1>
          <p>
            Have you ever heard someone, perhaps your teacher, remark that your
            writing is boring? How can you write more interestingly? Well, Show
            ME can help you do just that! Instead of writing dull elementary
            sentences, learn and practice writing vivid and exciting sentences.
            Don't tell, but show instead! Paint a picture in the readers' minds
            with mere words. Start today!{" "}
          </p>
          <a
            href="/MyPage"
            onClick={join}
            className="btn btn-primary joinbutton"
          >
            Join Us!
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
