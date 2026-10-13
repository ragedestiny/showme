//  Approved sentences reducer, keep track of approved sentences
const approvedsentences = (approvedsentences = [], action) => {
  switch (action.type) {
    case "FETCH_APPROVED":
      return action.payload;
    default:
      return approvedsentences;
  }
};

export default approvedsentences;
