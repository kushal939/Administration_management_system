import { useState } from 'react';

const TutorialModal = ({ open, onClose, onDontShowAgain, content }) => {
  const [index, setIndex] = useState(0);
  if (!open) return null;

  const steps = content?.steps || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-11/12 max-w-2xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">{content?.title || 'Tutorial'}</h3>
            <p className="text-sm text-gray-500">{content?.subtitle || ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onDontShowAgain} className="text-sm text-gray-600 hover:underline">Don't show again</button>
            <button onClick={onClose} className="text-sm text-red-600">Close</button>
          </div>
        </div>

        <div className="mt-4">
          {steps.length === 0 ? <p className="text-sm text-gray-600">No tutorial available.</p> : (
            <div>
              <div className="mb-4">
                <h4 className="font-semibold">Step {index + 1} of {steps.length}</h4>
                <p className="mt-2 text-sm text-gray-700">{steps[index]}</p>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <button disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))} className="px-3 py-1 rounded bg-gray-200 mr-2 disabled:opacity-50">Previous</button>
                  <button disabled={index === steps.length - 1} onClick={() => setIndex(i => Math.min(steps.length - 1, i + 1))} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">Next</button>
                </div>

                <div>
                  <button onClick={() => { onDontShowAgain(); onClose(); }} className="px-3 py-1 rounded bg-green-600 text-white">Done & Don't Show</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
