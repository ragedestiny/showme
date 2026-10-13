import React from "react";
import { useNavigate } from "react-router";

// React footer component
export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="site-footer">
      <div className="p-3">
        &copy; {new Date().getFullYear()} Copyright:{" "}
        <a className="text-dark" href="#" onClick={() => navigate("/")}>
          Show ME
        </a>
      </div>
    </footer>
  );
}
