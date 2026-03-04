/* ─────────────────────────────────────────────────────────────────────────────
   leadEvents.js
   Tiny event bus — fire once after any lead mutation (status, note, edit,
   assign, create, delete, import). Every page/hook that shows lead data
   listens to this event and silently reloads.

   Usage:
     import { emitLeadUpdate, onLeadUpdate, offLeadUpdate } from "../utils/leadEvents";

     // After any successful mutation:
     emitLeadUpdate();

     // In a component/hook:
     useEffect(() => {
       const unsub = onLeadUpdate(() => reload(true));
       return unsub;
     }, [reload]);
───────────────────────────────────────────────────────────────────────────── */

const EVENT = "crm:lead:updated";

/** Fire the event — call this after every successful mutation */
export function emitLeadUpdate() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Subscribe — returns an unsubscribe function */
export function onLeadUpdate(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
