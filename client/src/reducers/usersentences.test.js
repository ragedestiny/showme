import { describe, expect, it } from "vitest";
import usersentences from "./usersentences";

const day1 = { _id: "s1", title: "day1", show: "Frost crackled beneath my boots." };
const day2 = { _id: "s2", title: "day2", show: "Heat shimmered above the road." };

describe("the student's list of sentences", () => {
  it("adds a newly saved sentence at the end", () => {
    const list = usersentences([day1], { type: "CREATE", payload: day2 });

    expect(list).toEqual([day1, day2]);
  });

  // What a QA Wolf run recorded: MyPage's list request was still running when
  // the student saved day 1, the server answered it with day 1 already in it,
  // and then the save's own answer arrived. Adding day 1 again listed it twice
  // and made the next save "day3".
  it("doesn't add a saved sentence that the list already has", () => {
    const fromServer = usersentences([], { type: "FETCH_ALL", payload: [day1] });

    const list = usersentences(fromServer, { type: "CREATE", payload: day1 });

    expect(list).toEqual([day1]);
  });
});
