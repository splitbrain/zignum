export function createPlayer(name, isAI = false) {
  return {
    name,
    score: 0,
    isAI
  };
}
