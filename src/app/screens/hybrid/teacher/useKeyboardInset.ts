/**
 * How far the phone keyboard covers a view, so the teacher's input stays
 * just above it, on iOS AND Android.
 *
 * Why not KeyboardAvoidingView with behavior undefined on Android (the bug
 * the student hit, 2026-11-18): the app is edge-to-edge
 * (android/gradle.properties edgeToEdgeEnabled=true), and an edge-to-edge
 * window is not resized by adjustResize, so nothing lifted the input. Why
 * not an RN Modal: under edge-to-edge its dialog window is edge-to-edge too
 * (adjustResize does nothing there either), and React Native reads the
 * keyboard from the main window only, so a Modal on Android would have no
 * keyboard events at all. The teacher's screen is therefore a full-screen
 * view in the main window (TeacherScreen.tsx), and this hook pads it with
 * the part of the keyboard that covers it:
 *   inset = max(0, bottom of the view - top of the keyboard)
 * both in window coordinates (measureInWindow; the keyboard events'
 * endCoordinates.screenY: the keyboard's top on iOS, the visible area's
 * bottom with adjustResize on Android). Measuring the view itself, not the
 * screen, means a parent that already makes room for the keyboard (the
 * board's own KeyboardAvoidingView) gives an inset of 0, not twice the room;
 * the view is measured again whenever its frame changes.
 * iOS: keyboardWillChangeFrame / keyboardWillHide, animated like the
 * keyboard; Android: keyboardDidShow / keyboardDidHide (the only events).
 * To be seen on the owner's Android phone (not verifiable in the simulator).
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

type Measurable = Pick<ComponentRef<typeof View>, 'measureInWindow'>;

/** The keyboard's top in window coordinates, from an event (null when it is hidden). */
export function keyboardTop(e: KeyboardEvent | null): number | null {
  if (!e || e.endCoordinates.height <= 0) {
    return null;
  }
  const screen = Dimensions.get('screen').height;
  const y = e.endCoordinates.screenY;
  if (Number.isFinite(y) && y >= screen) {
    return null; // iOS: the keyboard is leaving the screen
  }
  // No usable top: read it from the height (the keyboard rests on the bottom).
  return Number.isFinite(y) && y > 0 ? y : screen - e.endCoordinates.height;
}

/** The part of the keyboard over a view whose bottom edge is at `bottom`. */
export const coveredBy = (bottom: number, top: number | null): number =>
  top === null ? 0 : Math.max(0, Math.round(bottom - top));

export function useKeyboardInset(
  ref: RefObject<Measurable | null>,
  active: boolean,
): { inset: number; onLayout: () => void } {
  const [inset, setInset] = useState(0);
  const top = useRef<number | null>(null);

  const measure = useCallback(() => {
    const node = ref.current;
    if (typeof node?.measureInWindow !== 'function' || top.current === null) {
      setInset(0);
      return;
    }
    node.measureInWindow((_x, y, _w, h) => {
      if (Number.isFinite(y) && Number.isFinite(h)) {
        setInset(coveredBy(y + h, top.current));
      }
    });
  }, [ref]);

  useEffect(() => {
    if (!active) {
      top.current = null;
      setInset(0);
      return;
    }
    const onChange = (e: KeyboardEvent) => {
      top.current = keyboardTop(e);
      if (Platform.OS === 'ios' && e.duration > 0) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: {
            duration: e.duration,
            type: LayoutAnimation.Types[e.easing] ?? 'keyboard',
          },
        });
      }
      measure();
    };
    const onHide = (e: KeyboardEvent) => {
      top.current = null;
      if (Platform.OS === 'ios' && e.duration > 0) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: {
            duration: e.duration,
            type: LayoutAnimation.Types[e.easing] ?? 'keyboard',
          },
        });
      }
      setInset(0);
    };
    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', onChange),
            Keyboard.addListener('keyboardWillHide', onHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', onChange),
            Keyboard.addListener('keyboardDidHide', onHide),
          ];
    return () => subs.forEach(s => s.remove());
  }, [active, measure]);

  return { inset, onLayout: measure };
}
