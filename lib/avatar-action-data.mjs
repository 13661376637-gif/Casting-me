// Load a JavaScript module lazily so the production bundler includes the JSON.
// A dynamic JSON import with attributes was left as a missing runtime URL.
import actions from './avatar-action.json' with { type: 'json' };
export default actions;
