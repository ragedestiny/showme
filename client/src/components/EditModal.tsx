import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useDispatch } from "react-redux";
import { editSentences } from "../actions/usersentences";
import { fetchUser } from "../actions/user";

// The pencil: Font Awesome Free's "pen-to-square" icon (regular style, CC BY
// 4.0, https://fontawesome.com/license/free), drawn directly instead of
// through Font Awesome's code, which took about 140 KB for this one icon. The
// classes give it Font Awesome's size, natural width and bounce (styles.css
// and Font Awesome's stylesheet), exactly as before.
const Pencil = ({ hidden, onClick }) => (
  <svg
    data-prefix="far"
    data-icon="pen-to-square"
    className="svg-inline--fa fa-pen-to-square fa-bounce fa-lg fa-width-auto"
    role="img"
    viewBox="0 0 512 512"
    aria-hidden="true"
    hidden={hidden}
    onClick={onClick}
  >
    <path
      fill="currentColor"
      d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4 88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1 17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z"
    />
  </svg>
);

// props.sentence: the sentence to edit; props.tell: its tell sentence;
// props.showEdit: whether to show the pencil (the mouse is over the sentence)
function EditModal(props) {
  const dispatch = useDispatch();

  // show or hide the edit modal window
  const [show, setShow] = useState(false);

  // State for newly edited sentence
  const [newSentence, setNewSentence] = useState("");

  // handle showing and hiding the edit modal
  const handleClose = () => setShow(false);
  const handleShow = () => {
    setNewSentence(props.sentence.show); // Initialize with the current sentence when the modal is shown
    setShow(true);
  };

  // update the edited sentence
  function updateSentence() {
    // If nothing is entered, just return nothing
    if (newSentence.trim() === "") return;

    const updatedSentenceInfo = {
      ...props.sentence,
      show: newSentence,
      createdAt: new Date(),
      approved: false,
      toRedo: false,
    };

    // Send the updated sentence to the backend. When it answers, the store's
    // list is updated, and MyPage shows the change.
    dispatch(editSentences(updatedSentenceInfo)).then(() =>
      dispatch(fetchUser())
    );

    // Clear out the modal textbox
    setNewSentence("");
  }

  // React bootstrap edit modal for editing the sentences
  return (
    <>
      <Pencil hidden={!props.showEdit} onClick={handleShow} />
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{props.tell}</Modal.Title>
        </Modal.Header>
        <form>
          <Modal.Body
            autoFocus
            as="textarea"
            className="form-control"
            rows={4}
            value={newSentence}
            onChange={(e) => setNewSentence(e.target.value)}
          ></Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                updateSentence();
                handleClose();
              }}
            >
              Save Changes
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}

export default EditModal;
