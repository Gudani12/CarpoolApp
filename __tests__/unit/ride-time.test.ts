import { estimateArrivalTime } from "../../lib/ride-time";

describe("estimateArrivalTime", () => {
  it("adds the route duration to the departure time", () => {
    expect(estimateArrivalTime("18:00:00", 45 * 60)).toBe("18:45");
  });

  it("wraps arrival time across midnight", () => {
    expect(estimateArrivalTime("23:45:00", 30 * 60)).toBe("00:15");
  });

  it("returns null for invalid departure times or route durations", () => {
    expect(estimateArrivalTime("25:00", 45 * 60)).toBeNull();
    expect(estimateArrivalTime("18:00", 0)).toBeNull();
  });
});
