import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/esm/Container";
import { useDispatch, useSelector } from "react-redux";
import { createSentence } from "../actions/usersentences";
import { fetchUser } from "../actions/user";

const COME_BACK_LATER = "Come Back Later For More Sentences!";

// `ready`: the student's list has arrived from the server, so the day number
// below is right and a save can't cross with the list request
function InputSentence({ ready }) {
  const userSentences = useSelector((state) => state.usersentences);
  const tellSentences = useSelector((state) => state.tellsentences);
  const dispatch = useDispatch();

  // What the student is typing, and whether we're waiting for the server
  const [newSentence, setNewSentence] = useState("");
  const [saving, setSaving] = useState(false);

  // Worked out from the store every time this draws, so they're never out of
  // date: once the server confirms a new sentence, the store's list grows and
  // these move on to the next day by themselves.
  const day = userSentences.length + 1;
  const sentence = tellSentences[day - 1]?.tell || COME_BACK_LATER;

  // once a new sentence is entered, send it to the database
  async function handleSubmit(event) {
    // prevents the page from refreshing
    event.preventDefault();

    if (!ready) return;

    // if user didn't enter anything (or only spaces and line breaks),
    // disregard submit, so a blank sentence can't use up a day
    if (newSentence.trim() === "") return;

    if (day > tellSentences.length) {
      // Prevent submission if there are no more tell sentences
      alert(
        "You have reached the end of available sentences. Come back later for more sentences!"
      );
      setNewSentence("");
      return;
    }

    const newEntry = {
      title: "day" + day,
      tell: sentence,
      show: newSentence,
      hideedit: true,
    };

    // clear the input textbox, and disable the button until the server answers
    // so a double click can't submit the same day twice
    setNewSentence("");
    setSaving(true);
    try {
      await dispatch(createSentence(newEntry));
      dispatch(fetchUser());
    } finally {
      setSaving(false);
    }
  }

  // form component for inputting new sentence
  return (
    <Container className="formContainer">
      <Form>
        <Form.Group className="mb-3" controlId="currentsentence">
          <Form.Text>Day {day}</Form.Text>
          <br></br>
          <Form.Label>{sentence}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Don't just tell me, instead SHOW ME!"
            value={newSentence}
            onChange={(e) => setNewSentence(e.target.value)}
          />
        </Form.Group>
        <div className="submitSentence">
          <Button
            variant="primary"
            type="submit"
            onClick={handleSubmit}
            disabled={saving || !ready}
          >
            Show ME!
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default InputSentence;
