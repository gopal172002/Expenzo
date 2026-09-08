let policyIdCounter = 0;
export function nextPolicyId() {
  policyIdCounter += 1;
  return `POL-${policyIdCounter}`;
}

let adminIdCounter = 0;
export function nextAdminId() {
  adminIdCounter += 1;
  return `ADM-${adminIdCounter}`;
}
