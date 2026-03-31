import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

export function useHaptics() {
  const { trigger } = useWebHaptics();

  const hapticClick = useCallback(() => trigger(10), [trigger]);
  const hapticTap = useCallback(() => trigger(8), [trigger]);
  const hapticBeat = useCallback(() => trigger(18), [trigger]);
  const hapticToggle = useCallback(() => trigger("nudge"), [trigger]);
  const hapticKeystroke = useCallback(() => trigger(4), [trigger]);
  const hapticDelete = useCallback(() => trigger(12), [trigger]);
  const hapticCountdown = useCallback(() => trigger(30), [trigger]);
  const hapticScoreTick = useCallback(() => trigger(3), [trigger]);
  const hapticSuccess = useCallback(() => trigger("success"), [trigger]);
  const hapticError = useCallback(() => trigger("error"), [trigger]);

  return {
    hapticClick,
    hapticTap,
    hapticBeat,
    hapticToggle,
    hapticKeystroke,
    hapticDelete,
    hapticCountdown,
    hapticScoreTick,
    hapticSuccess,
    hapticError,
    trigger,
  };
}
