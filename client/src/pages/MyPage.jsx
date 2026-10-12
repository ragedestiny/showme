import React, { useEffect, useState } from "react";
import Badge from "react-bootstrap/Badge";
import ListGroup from "react-bootstrap/ListGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import InputSentence from "../components/InputSentence";
import EditModal from "../components/EditModal";
import Pagination from "react-bootstrap/Pagination";
import Button from "react-bootstrap/Button";
import { useSelector, useDispatch } from "react-redux";
import { getUserSentences } from "../actions/usersentences";
import { useLocation } from "react-router";
import * as config from "../../src/config";
import { useOpenLogin } from "../components/loginPopup";

function MyPage() {
  // get states from global react redux store
  const tellSentences = useSelector((state) => state.tellsentences);
  const user = useSelector((state) => state.user);
  const userSentences = useSelector((state) => state.usersentences);

  const dispatch = useDispatch();
  const location = useLocation();
  const openLogin = useOpenLogin();
  const signedIn = Object.keys(user).length !== 0;

  // Only things that belong to this screen are kept as state: which page is
  // open, and which sentence the mouse is over (to show its edit pencil).
  const [activePage, setActivePage] = useState(1);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const itemsPerPage = config.SentencesPerPageForMyPage;

  // The signed-in student's sentences (nobody's signed in: nothing to fetch).
  // Saving waits until they've arrived: the day number comes from this list,
  // and a save sent while it's still on its way can cross with it.
  const [listLoaded, setListLoaded] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    let current = true;
    dispatch(getUserSentences()).finally(() => {
      if (current) setListLoaded(true);
    });
    return () => {
      current = false;
    };
  }, [dispatch, location, signedIn]);

  // Everything below is worked out from the store each time this draws, so
  // it can never be out of date.
  const pageCount = Math.ceil(userSentences.length / itemsPerPage);
  // If the list shrinks, don't stay on a page that no longer exists
  const page = Math.min(activePage, Math.max(pageCount, 1));
  // Newest first, then the slice for the open page. Each entry keeps its
  // position in the original list (index), which matches its day.
  const pageItems = userSentences
    .map((sentence, index) => ({ sentence, index }))
    .reverse()
    .slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (signedIn) {
    // if there is a login user, display their own sentences
    return (
      <div className="contentmypage">
        <InputSentence ready={listLoaded} />

        <ListGroup as="ol">
          {pageItems.map(({ sentence, index }) => (
            <ListGroup.Item
              as="form"
              className="d-flex justify-content-between align-items-start form"
              key={sentence._id}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                backgroundColor:
                  sentence.approved === true
                    ? "#F1FEEC"
                    : sentence.toRedo === true
                    ? "#ffe1a8"
                    : "rgb(243, 236, 242)",
              }}
            >
              <OverlayTrigger
                placement="bottom"
                delay={{ show: 250, hide: 400 }}
                overlay={
                  <Tooltip id="button-tooltip">
                    {sentence.approved === true
                      ? "Approved"
                      : sentence.toRedo === true
                      ? "Need To Redo"
                      : "Pending Approval"}
                  </Tooltip>
                }
              >
                {({ ref, ...triggerHandler }) => (
                  <div className="ms-2 me-auto">
                    <div
                      className="fw-bold wordwrap"
                      {...triggerHandler}
                      ref={ref}
                    >
                      {sentence.show}
                    </div>
                    {tellSentences[index]?.tell}
                  </div>
                )}
              </OverlayTrigger>
              <Badge bg="primary" pill>
                {sentence.title?.toUpperCase()}
              </Badge>
              <EditModal
                sentence={sentence}
                tell={tellSentences[index]?.tell}
                showEdit={hoveredIndex === index}
              />
            </ListGroup.Item>
          ))}
        </ListGroup>
        <div className="pages">
          {pageCount > 1 && (
            <Pagination size="sm">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                (number) => (
                  <Pagination.Item
                    key={number}
                    active={number === page}
                    onClick={() => setActivePage(number)}
                  >
                    {number}
                  </Pagination.Item>
                )
              )}
            </Pagination>
          )}
        </div>
      </div>
    );
  }

  // Nobody's signed in (e.g. an old bookmark, or the login ran out): say so,
  // with a way to sign in, instead of an empty page. Signing in then opens
  // this page.
  return (
    <div className="contentmypage">
      <div className="page-message">
        <p>Sign in to write your own sentences and see them here.</p>
        <Button variant="primary" onClick={openLogin}>
          Sign in
        </Button>
      </div>
    </div>
  );
}
export default MyPage;
