import { useNavigate } from 'react-router-dom';
import '../../styles/csrDesign.css';

// Shown in place of a CSR form when the user can view CSR but not edit it. It
// stays inside the CSR shell: the shared /unauthorized page's Home button leads
// into TTA.
export default function CSRNoEditAccess() {
  const navigate = useNavigate();
  return (
    <div className="csrx csrx-page">
      <div className="empty" role="alert">
        <h3>You can view CSR, but not change it</h3>
        <p>Ask an admin for edit access to make this change.</p>
        <button type="button" className="ghostbtn" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    </div>
  );
}
