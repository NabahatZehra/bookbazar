import { useMemo, useState } from 'react';
import api from '../../services/api';

const LEVELS = [
  { id: 'primary', label: 'Primary', subtitle: 'Grade 1-5' },
  { id: 'secondary', label: 'Secondary', subtitle: 'Grade 6-10' },
  { id: 'higher_secondary', label: 'Higher Secondary', subtitle: 'Grade 11-12' },
  { id: 'university', label: 'University', subtitle: 'Degree Program' },
];

export default function EducationProfileModal({ isOpen, onSaved }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    level: '',
    currentGrade: '',
    board: '',
    institution: '',
    university: '',
    degree: '',
    field: '',
    semester: '',
  });

  const gradeOptions = useMemo(() => {
    if (form.level === 'primary') return [1, 2, 3, 4, 5];
    if (form.level === 'secondary') return [6, 7, 8, 9, 10];
    if (form.level === 'higher_secondary') return [11, 12];
    return [];
  }, [form.level]);

  if (!isOpen) return null;
  const isSchool = ['primary', 'secondary', 'higher_secondary'].includes(form.level);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/users/education-profile', {
        level: form.level,
        currentGrade: isSchool ? Number(form.currentGrade) : null,
        university: form.level === 'university' ? form.university : null,
        degree: form.level === 'university' ? form.degree : null,
        field: form.level === 'university' ? form.field : null,
        semester: form.level === 'university' ? Number(form.semester) : null,
        institution: form.institution || null,
        board: form.board || null,
      });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[12000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6">
        <h2 className="text-2xl font-bold text-gray-900">Set your education profile</h2>
        <p className="text-gray-600 mt-1">This helps us recommend the right books for you.</p>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, level: lvl.id }));
                  setStep(2);
                }}
                className="text-left border rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50"
              >
                <div className="font-bold text-gray-900">{lvl.label}</div>
                <div className="text-sm text-gray-500">{lvl.subtitle}</div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && isSchool && (
          <div className="mt-6 space-y-4">
            <select className="w-full border rounded-lg px-3 py-2" value={form.currentGrade} onChange={(e) => setForm((p) => ({ ...p, currentGrade: e.target.value }))}>
              <option value="">What grade are you in?</option>
              {gradeOptions.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select className="w-full border rounded-lg px-3 py-2" value={form.board} onChange={(e) => setForm((p) => ({ ...p, board: e.target.value }))}>
              <option value="">Which board?</option>
              <option>Punjab Board</option>
              <option>Federal Board</option>
              <option>Cambridge (O/A Level)</option>
              <option>Other</option>
            </select>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="School/College name (optional)" value={form.institution} onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded border" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => setStep(3)} disabled={!form.currentGrade}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && form.level === 'university' && (
          <div className="mt-6 space-y-4">
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Which university? (FAST, LUMS, NUST...)" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} />
            <select className="w-full border rounded-lg px-3 py-2" value={form.degree} onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))}>
              <option value="">Select degree</option>
              <option>BS</option><option>BE</option><option>MBA</option><option>BBA</option><option>MBBS</option><option>Other</option>
            </select>
            <select className="w-full border rounded-lg px-3 py-2" value={form.field} onChange={(e) => setForm((p) => ({ ...p, field: e.target.value }))}>
              <option value="">Field of study</option>
              <option>Computer Science</option><option>Software Engineering</option><option>Electrical Engineering</option>
              <option>Business/Commerce</option><option>Medical/Biology</option><option>Mathematics</option>
              <option>Physics</option><option>Law</option><option>Arts</option><option>Other</option>
            </select>
            <select className="w-full border rounded-lg px-3 py-2" value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}>
              <option value="">Current semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded border" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => setStep(3)} disabled={!form.field || !form.semester}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6">
            <div className="text-gray-800">
              Great! We&apos;ll suggest books perfect for{' '}
              <span className="font-bold">
                {form.level === 'university' ? `${form.field} Semester ${form.semester}` : `Grade ${form.currentGrade}`}
              </span>
              .
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded border" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" onClick={() => void saveProfile()} disabled={saving}>
                {saving ? 'Saving...' : 'Start Exploring Books'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
