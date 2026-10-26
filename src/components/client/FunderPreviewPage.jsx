import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { csrAPI, withBrandImages } from '../../services/api';
import ClientPortalPage, { asList } from './ClientPortalPage';

// The funder portal as one grant's funder sees it, for staff ("Preview as
// funder", D-018). One call, /csr/projects/<id>/funder-view/, returns what the
// funder's five /api/client/ calls would; the server computes it with the same
// rules, so nothing about visibility is decided here. Photos and report files
// come from the staff endpoints, which staff can already read.
//
// The portal asks for branding, data and the certificate in the same moment;
// they share one request rather than making three.
export function previewSource(projectId) {
  let pending = null;
  const view = () => {
    if (!pending) {
      pending = csrAPI.funderView(projectId);
      const clear = () => { pending = null; };
      pending.then(clear, clear);
    }
    return pending;
  };
  return {
    branding: async () => withBrandImages((await view()).branding || null),
    data: async () => {
      const v = await view();
      return {
        project: v.project || null,
        activities: asList(v.activities),
        reports: asList(v.reports),
        deliverables: asList(v.deliverables),
        athletes: asList(v.athletes),
      };
    },
    certificate: async () => (await view()).certificate,
    activityPhoto: (activityId, photoId) => csrAPI.activityPhotos.file(activityId, photoId),
    reportFile: (reportId) => csrAPI.reportFile.download(reportId),
  };
}

export default function FunderPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const source = useMemo(() => previewSource(id), [id]);
  const preview = useMemo(() => ({ onBack: () => navigate(`/csr/${id}`) }), [id, navigate]);
  return <ClientPortalPage source={source} preview={preview} />;
}
