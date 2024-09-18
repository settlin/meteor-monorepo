// import { Event } from "meteor/settlin:astronomy";

const triggerAfterSoftRestore = function(doc, trusted) {
  // Trigger the "afterSoftRestore" event handlers.
  doc.dispatchEvent(
    new Event("afterSoftRestore", {
      propagates: true,
      trusted: trusted
    })
  );
};

export default triggerAfterSoftRestore;
