// user reducer, keep track of user
const user = (state = {}, action) => {
  switch (action.type) {
    case "FIND_USER":
      return action.payload;
    case "LOGOUT":
      return {};
    default:
      return state;
  }
};

export default user;
