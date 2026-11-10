import { jsonResponse } from '../_shared/http.ts'

// V2.3 standardizes Checkout Pro on the Orders API. This local-only tombstone
// prevents accidental use of the retired Preferences API endpoint.
Deno.serve(() => jsonResponse({
  error: 'ENDPOINT_RETIRED',
  replacement: 'checkout-create-order',
}, 410))
