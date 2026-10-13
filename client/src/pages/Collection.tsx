import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Button from "@mui/material/Button";
import Cards from "../components/Cards";
import FadeMenu from "../components/FadeMenu";
import LoadingOverlay from "react-loading-overlay-ts";
import { fetchApprovedSentences } from "../actions/approvedsentences";

// A copy of the list in a random order
const shuffle = (sentences) =>
  [...sentences]
    .map((sentence) => ({ sentence, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ sentence }) => sentence);

function Collection() {
  const dispatch = useDispatch();

  // The server's list (newest first), the order chosen for display (random by
  // default), whether we're still waiting for the server, and whether the
  // last request failed. Bumping `attempt` asks the server again.
  const [sentences, setSentences] = useState([]);
  const [displaySentences, setDisplay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Ask the server for the approved sentences, and shuffle them as soon as
  // they arrive. Only the server's answer is ever shown: an old list the
  // browser may have remembered never is, not even by the sort menu.
  useEffect(() => {
    let stillHere = true;
    dispatch(fetchApprovedSentences()).then((fresh) => {
      if (!stillHere) return; // the visitor already left this page
      if (fresh) {
        setSentences(fresh);
        setDisplay(shuffle(fresh));
      } else {
        setFailed(true);
      }
      setLoading(false);
    });
    return () => {
      stillHere = false;
    };
  }, [dispatch, attempt]);

  // After a failed request: show the loader again and ask once more
  const tryAgain = () => {
    setFailed(false);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  // The sort menu's choices
  const randomizeSentences = () => setDisplay(shuffle(sentences));
  const displayNewestSentences = () => setDisplay(sentences);

  // collection page to display approved sentences
  return (
    <LoadingOverlay
      active={loading}
      spinner
      text="Loading..."
      className="contentcollection"
    >
      {failed ? (
        <div className="page-message" role="alert">
          <p>
            We couldn&apos;t load the collection. Check your internet
            connection, then try again.
          </p>
          <Button variant="contained" onClick={tryAgain}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="dropdown">
            <FadeMenu
              newest={displayNewestSentences}
              randomize={randomizeSentences}
            />
          </div>
          {!loading && sentences.length === 0 ? (
            <p className="page-message">
              No sentences have been approved yet.
            </p>
          ) : (
            <div>
              <Cards displaySentences={displaySentences} />
            </div>
          )}
        </>
      )}
    </LoadingOverlay>
  );
}

export default React.memo(Collection);
