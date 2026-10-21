// Tab positions on the grant page (CSRProjectDetailPage), which reads
// location.state.tab. Utilisation exists only for a csr_certificate holder,
// and it is last, so the other positions never move.
export const GRANT_TABS = {
  overview: 0,
  contacts: 1,
  activities: 2,
  reports: 3,
  contracts: 4,
  utilisation: 5,
};

// Back to the grant, on the tab the record lives on, carrying the save message
// when there is one.
export const grantTabState = (tab, saved) => ({ state: saved ? { saved, tab } : { tab } });
