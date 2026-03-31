const MESSAGES: Record<number, string[]> = {
  1: [
    "You were not tapping to the same beat. Or any beat.",
    "This is what happens when rhythm is optional.",
    "We showed you a beat. You chose violence.",
    "Impressive, actually. Being this off takes coordination.",
  ],
  2: [
    "Close to nothing. And not in a zen way.",
    "Your taps arrived like a package from Temu.",
    "We're not mad. We're confused.",
    "Somewhere between 'trying' and 'lying about trying.'",
  ],
  3: [
    "You heard the beat. That's the nicest thing we can say.",
    "Off by enough to be noticed. Not enough to be interesting.",
    "This has the confidence of someone who claps on 1 and 3.",
    "Your timing hesitated, then committed to the wrong answer.",
  ],
  4: [
    "Almost mediocre. Keep going.",
    "You found the beat, briefly, by accident.",
    "Your rhythm has a vibe. The vibe is 'close enough.'",
    "A generous 4. We rounded up. Be grateful.",
  ],
  5: [
    "Perfectly average. No one will talk about this.",
    "The human-default rhythm score. You are baseline.",
    "Mid. Not a roast — a diagnosis.",
    "5/10. The score equivalent of 'it was fine.'",
  ],
  6: [
    "Above average. Nobody is impressed by above average.",
    "Good enough to know you could be better. Worse enough to know you aren't.",
    "6/10. You can mention this casually. Don't bring it up twice.",
    "Decent. Your rhythm has health insurance and a 401k.",
  ],
  7: [
    "Okay, you've got something. Don't get cocky.",
    "7/10 — the score that haunts perfectionists.",
    "Annoyingly good. Not good enough to brag. Too good to forget.",
    "Your rhythm just got promoted to assistant manager.",
  ],
  8: [
    "Tight. Genuinely tight. We checked.",
    "You're locked in. This is not a compliment — it's a warning.",
    "8/10. The beat barely noticed you left. Respect.",
    "Starting to suspect you've done this before.",
  ],
  9: [
    "Unsettling accuracy. Please find a different hobby.",
    "The beat just asked for your number.",
    "9/10. One point away from perfect and it will haunt you.",
    "We're checking if you're a bot. Don't take it personally. Actually, do.",
  ],
  10: [
    "Zero drift. Either you're gifted or this is a cry for help.",
    "10/10. We have nothing to say. You win. Leave.",
    "Perfect score. We're running diagnostics. On you.",
    "Congratulations. This will be the peak of your week and you know it.",
  ],
};

export function getRandomMessage(score: number): string {
  const bracket = Math.max(1, Math.min(10, score));
  const pool = MESSAGES[bracket]!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
