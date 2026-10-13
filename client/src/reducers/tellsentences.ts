// tell sentence reducer, keep track of tell sentences
const tellsentences = (tellsentences = [], action) => {
  switch (action.type) {
    case "FETCH_TELL":
      return action.payload;
    default:
      return tellsentences;
  }
};

export default tellsentences;
