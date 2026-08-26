// The wire shape for POST/PUT /api/trial-cities/, kept out of CityModal so it
// can be asserted without rendering the dialog.
//
// Two rules the modal used to break:
//
// 1. The optional fields are `allow_blank=True` but NOT `allow_null=True` on
//    the serializer. Coercing an untouched box to null therefore 400s the whole
//    save — a city could not be created until every optional field was filled.
//    An empty box sends '', which is what "not set" means on the server.
// 2. The region picker wrote a `region` key. `zone` is not a field any
//    serializer accepts, so it was silently discarded and the value never
//    saved.

// Mirrors TrialCityLocation.REGION_CHOICES. The serializer is a ChoiceField, so
// anything outside this list is a 400 — '' is the "not decided yet" value.
export const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

export function buildCityPayload(formData, code) {
  return {
    code,
    state: formData.state || '',
    city: formData.city || '',
    trialCityName: formData.city || '',
    region: formData.region || '',
    assignedREP: formData.assignedREP || '',
    groundLocation: formData.groundLocation || '',
    groundVerified: !!formData.groundVerified,
    trialType: formData.trialType || '',
    monthOnly: formData.monthOnly || '',
    comment: formData.comment || '',
  };
}
