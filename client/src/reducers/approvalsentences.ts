//  Approval sentences reducer, keep track of sentences awaiting approval
const approvalsentences = (approvalsentences = [], action) => {
  switch (action.type) {
    case "FETCH_APPROVAL":
      return action.payload;
    case "UPDATE_APPROVAL_SENTENCES":
      return action.payload;
    // Don't leave the review queue saved in the browser after an admin logs out
    case "LOGOUT":
      return [];
    default:
      return approvalsentences;
  }
};

export default approvalsentences;
