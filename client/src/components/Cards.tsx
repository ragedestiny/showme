import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { useSelector } from "react-redux";
import * as config from "../../src/config";
import type { SentenceWithAuthor, TellSentence } from "../api/types";
import type { RootState } from "../reducers/types";

// The cards for one list of sentences, plus a record of which pictures are
// still loading. Cards gives this a key made from the list, so a new list
// (or a new order) gets a fresh CardGrid that starts with every picture
// loading, instead of an effect resetting the record after drawing.
function CardGrid({
  sentences,
  tellSentences,
}: {
  sentences: SentenceWithAuthor[];
  tellSentences: TellSentence[];
}) {
  const [loadingState, setLoadingState] = useState(() =>
    Array(config.DisplayCollectionSentences).fill(true)
  );

  // Function to handle image load
  const handleImageLoad = (index: number) => {
    setLoadingState((prevState) => {
      const newState = [...prevState];
      newState[index] = false;
      return newState;
    });
  };

  // Show every picture after 4 seconds, even if some never finish loading.
  // (A timer is outside React, which is what effects are for.)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingState((prevState) => prevState.map(() => false));
    }, 4000);

    // Clean up the timeout when the component unmounts
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Grid
      container
      sx={{ padding: "1% 0" }}
      rowSpacing={{ xs: 1, sm: 2, md: 4 }}
      columns={{ xs: 4, sm: 8, md: 12 }}
    >
      {sentences.map((sentence, index) => {
        const day = Number(sentence.title.match(/\d+$/)?.[0]);
        return (
          <Grid
            size={{ xs: 4, sm: 4, md: 4 }}
            key={sentence._id}
            sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <Card
              sx={{
                // Fill the column (up to 500px) whatever the sentence
                // length; heights stay natural, centred in the row.
                width: "100%",
                maxWidth: 500,
                boxShadow: "1.5px 1.5px rgba(0, 0, 255, .2)",
                margin: "0% 2%",
                // Pink-to-aqua gradient. Set here rather than in styles.css
                // because MUI 9's own card styles (which reset the background
                // image) come after styles.css; sx always comes after them.
                backgroundImage:
                  "radial-gradient(circle, rgba(251, 228, 238, 1) 20%, rgba(236, 255, 255, 1) 77%)",
              }}
            >
              {loadingState[index] && (
                <Skeleton
                  animation="wave"
                  variant="rectangular"
                  width={500}
                  height={250}
                  hidden={!loadingState[index]}
                />
              )}
              <CardMedia
                component="img"
                sx={{ height: 250 }}
                image={tellSentences[day - 1]?.image}
                title={sentence.tell}
                onLoad={() => handleImageLoad(index)}
                hidden={loadingState[index]}
              />
              <CardContent>
                <Typography gutterBottom variant="body1" component="div">
                  {sentence.show}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {sentence.tell}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", textAlign: "right" }}
                >
                  {/* First name and last initial. Some accounts have no
                      last name (the database doesn't require one). */}
                  {sentence.author.lastName
                    ? `${sentence.author.firstName} ${sentence.author.lastName[0]}.`
                    : sentence.author.firstName}
                </Typography>
              </CardContent>
              <CardActions>
                <Button hidden={true} size="small">
                  Learn More
                </Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

function Cards(props: { displaySentences?: SentenceWithAuthor[] }) {
  // tell sentences from global redux state
  const tellSentences = useSelector(
    (state: RootState) => state.tellsentences
  );
  const approvedSentences = useSelector(
    (state: RootState) => state.approvedsentences
  );

  // Card component for displaying sample students' approved sentences once global state loaded
  if (approvedSentences.length !== 0) {
    const sentences = (props.displaySentences ?? []).slice(
      0,
      config.DisplayCollectionSentences
    );
    // A different list, or the same list in a different order, gets a new key
    const listKey = sentences.map((sentence) => sentence._id).join(",");
    return (
      <CardGrid
        key={listKey}
        sentences={sentences}
        tellSentences={tellSentences}
      />
    );
  }
}

export default React.memo(Cards);
