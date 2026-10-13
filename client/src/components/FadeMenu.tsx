import { useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Fade from "@mui/material/Fade";
// Only this icon: "@mui/icons-material" on its own means thousands of icon
// files, which the build drops but tests (and the dev server) load one by one
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export default function FadeMenu(props) {
  // keep track of display state - initialize with Random
  const [display, setDisplay] = useState("Random");
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close the menu without changing anything (clicking outside it, Escape)
  const handleClose = () => setAnchorEl(null);

  // Each menu item says directly which option it is, rather than this
  // reading a label back from the page.
  const choose = (option) => {
    setAnchorEl(null);
    // set dropdown menu display to selected
    setDisplay(option);
    if (option === "Random") props.randomize();
    if (option === "Newest") props.newest();
  };

  // react component for dropdown menu for displaying approved sentences
  return (
    <div>
      <Button
        id="fade-button"
        aria-controls={open ? "fade-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
      >
        {display}
      </Button>
      <Menu
        id="fade-menu"
        slotProps={{ list: { "aria-labelledby": "fade-button" } }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock={true}
        slots={{ transition: Fade }}
      >
        <MenuItem onClick={() => choose("Random")}>Random</MenuItem>
        <MenuItem onClick={() => choose("Newest")}>Newest</MenuItem>
      </Menu>
    </div>
  );
}
