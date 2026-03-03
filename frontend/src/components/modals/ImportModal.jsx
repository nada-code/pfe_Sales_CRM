import { useState, useRef } from "react";
import { createLead } from "../../api/leadsApi";
import {
  parseCSV,
  validateRow,
  normalizeStatus,
  normalizeSource,
} from "../../utils/leadsUtils";
import { StatusBadge, SourceBadge } from "../UI";

export default function ImportModal({ onClose, onDone }) {
  const [step, setStep] = useState("upload");
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    failed: 0,
  });
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef(null);
  const abortRef = useRef(false);

  /* ============================================================
     FILE HANDLER (CSV + JSON)
  ============================================================ */

  function handleFile(file) {
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();

    if (!["csv", "txt", "json"].includes(extension)) {
      alert("Format non supporté (.csv, .txt, .json uniquement)");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let parsedRows = [];

        // JSON
        if (extension === "json") {
          const jsonData = JSON.parse(e.target.result);

          if (!Array.isArray(jsonData)) {
            throw new Error("Le fichier JSON doit contenir un tableau");
          }

          parsedRows = jsonData.map((item) => ({
            firstName: item.firstName || "",
            lastName: item.lastName || "",
            email: item.email || "",
            phone: item.phone || "",
            city: item.city || "",
            country: item.country || "",
            status: item.status || "New",
            source: item.source || "Other",
          }));
        }

        // CSV / TXT
        else {
          const { rows } = parseCSV(e.target.result);
          parsedRows = rows;
        }

        const errs = {};
        parsedRows.forEach((r, i) => {
          const validation = validateRow(r);
          if (validation.length) errs[i] = validation;
        });

        setRows(parsedRows);
        setErrors(errs);
        setStep("preview");
      } catch (err) {
        alert("Erreur : " + err.message);
      }
    };

    reader.readAsText(file, "UTF-8");
  }

  /* ============================================================
     START IMPORT
  ============================================================ */

  async function startImport() {
    abortRef.current = false;

    const validRows = rows.filter((_, i) => !errors[i]);

    setProgress({
      done: 0,
      total: validRows.length,
      failed: 0,
    });

    setStep("importing");

    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      if (abortRef.current) break;

      try {
        await createLead({
          ...validRows[i],
          status: normalizeStatus(validRows[i].status),
          source: normalizeSource(validRows[i].source),
        });
      } catch {
        failed++;
      }

      setProgress((p) => ({
        ...p,
        done: i + 1,
        failed,
      }));
    }

    setStep("done");
  }

  /* ============================================================
     SAMPLE FILES
  ============================================================ */

  // function downloadCSVSample() {
  //   const csv = [
  //     "firstName,lastName,email,phone,city,country,status,priority",
  //     "Jean,Dupont,jean@example.com,+21612345678,Tunis,Tunisia,New,High",
  //   ].join("\n");

  //   const url = URL.createObjectURL(
  //     new Blob([csv], { type: "text/csv" })
  //   );

  //   const a = Object.assign(document.createElement("a"), {
  //     href: url,
  //     download: "leads_sample.csv",
  //   });

  //   a.click();
  //   URL.revokeObjectURL(url);
  // }

  // function downloadJSONSample() {
  //   const sample = [
  //     {
  //       firstName: "Jean",
  //       lastName: "Dupont",
  //       email: "jean@example.com",
  //       phone: "+21612345678",
  //       city: "Tunis",
  //       country: "Tunisia",
  //       status: "New",
  //       priority: "High",
  //     },
  //   ];

  //   const blob = new Blob(
  //     [JSON.stringify(sample, null, 2)],
  //     { type: "application/json" }
  //   );

  //   const url = URL.createObjectURL(blob);

  //   const a = Object.assign(document.createElement("a"), {
  //     href: url,
  //     download: "leads_sample.json",
  //   });

  //   a.click();
  //   URL.revokeObjectURL(url);
  // }

  const validCount = rows.length - Object.keys(errors).length;
  const invalidCount = Object.keys(errors).length;

  /* ============================================================
     UPLOAD STEP
  ============================================================ */

  if (step === "upload")
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal modal--lg">
          <div className="modal__header">
            <div>
              <div className="modal__title">Import Leads</div>
              <div className="modal__subtitle">
                CSV ou JSON
              </div>
            </div>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>

          <div className="modal__body modal__body--pad22">
            <div
              className={`import-dropzone ${dragOver ? "import-dropzone--over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileRef.current.click()}
            >
              <div>Glissez-déposez votre fichier ici</div>
              <button className="btn-primary" style={{ pointerEvents: "none" }}>
                Choisir un fichier
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.json"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
            <div className="import-format-box">
            <div className="import-format-box__title">📋 Format attendu</div>
            <div className="import-format-box__text">
              Colonnes obligatoires : <span className="import-format-box__required">firstName, lastName, email, phone</span><br />
              Colonnes optionnelles : <span className="import-format-box__optional">city, country, status, source</span><br />
              <div className="import-supported-formats__format">
                <strong>CSV / TXT</strong>
                <span>.csv, .txt</span>
              </div>
              <div className="import-supported-formats__format">
                <strong>JSON</strong>
                <span>.json</span>
              </div>
              {/* <span className="import-format-box__note">Colonnes françaises acceptées : prénom, nom, téléphone, ville, pays, statut, priorité</span> */}
            </div>
          </div>
            
            {/* <div style={{ marginTop: 15 }}>
              <button className="btn-cancel" onClick={downloadCSVSample}>
                Télécharger modèle CSV
              </button>
              <button
                className="btn-cancel"
                style={{ marginLeft: 10 }}
                onClick={downloadJSONSample}
              >
                Télécharger modèle JSON
              </button>
            </div> */}
          </div>
        </div>
      </div>
    );

  /* ============================================================
     PREVIEW STEP
  ============================================================ */

  if (step === "preview")
    return (
      <div className="modal-overlay">
        <div className="modal modal--xl">
          <div className="modal__header">
            <div>
              <div className="modal__title">Prévisualisation</div>
              <div className="modal__subtitle">
                {fileName} · {rows.length} lignes
              </div>
            </div>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>

          <div className="modal__scrollable-body">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Status</th>
                  <th>Priorité</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowErrors = errors[i];
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{row.firstName}</td>
                      <td>{row.lastName}</td>
                      <td>{row.email}</td>
                      <td>{row.phone}</td>
                      <td><StatusBadge status={normalizeStatus(row.status)} /></td>
                      <td><SourceBadge source={normalizeSource(row.source)} /></td>
                      <td>
                        {!rowErrors ? "✓" : "✕"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="modal__footer modal__footer--space">
          <button className="btn-cancel" onClick={() => setStep("upload")}>← Changer de fichier</button>
          <div className="import-footer-right">
            {invalidCount > 0 && <span className="import-footer-note">{invalidCount} ligne{invalidCount > 1 ? "s" : ""} ignorée{invalidCount > 1 ? "s" : ""}</span>}
            <button className="btn-cancel" onClick={onClose}>Annuler</button>
            <button className="btn-primary" style={{ opacity: validCount === 0 ? 0.5 : 1 }} disabled={validCount === 0} onClick={startImport}>
              ↑ Importer {validCount} lead{validCount > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  /* ============================================================
     IMPORTING STEP
  ============================================================ */

  if (step === "importing") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="modal-overlay">
        <div className="modal modal--center-content">
          <div className="modal-center__emoji">⏳</div>
          <div className="modal-center__title">Importation en cours…</div>
          <div className="import-progress-desc">
            {progress.done} / {progress.total} leads importés
            {progress.failed > 0 && <span className="import-progress-desc__errors">· {progress.failed} erreur{progress.failed > 1 ? "s" : ""}</span>}
          </div>
          <div className="import-progress-bar">
            <div className="import-progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="import-progress-pct">{pct}%</div>
          <button className="btn-cancel" onClick={() => { abortRef.current = true; }}>⏹ Annuler</button>
        </div>
      </div>
    );
  }

 /* ── DONE ───────────────────────────────────────────────────────────────── */
  if (step === "done") {
    const imported = progress.done - progress.failed;
    return (
      <div className="modal-overlay">
        <div className="modal modal--center-content">
          <div className="modal-center__emoji modal-center__emoji--lg">{progress.failed === 0 ? "🎉" : "⚠️"}</div>
          <div className="modal-center__title modal-center__title--lg">Import terminé</div>
          <div className="modal-center__desc modal-center__desc--lg">
            <span className="import-done__success">{imported} lead{imported > 1 ? "s" : ""} importé{imported > 1 ? "s" : ""}</span>
            {progress.failed > 0 && <><br /><span className="import-done__failed">{progress.failed} échec{progress.failed > 1 ? "s" : ""}</span></>}
          </div>
          <button className="btn-primary" onClick={() => { onDone(); onClose(); }}>✓ Voir les leads</button>
        </div>
      </div>
    );
  }

  return null;
}