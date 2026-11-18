import path from 'node:path';
// Pinned scientific wheels support CPython 3.10–3.12; venv must include pip.
export const pythonProbe='import sys,venv,ensurepip;sys.exit(not ((3,10)<=sys.version_info[:2]<(3,13)))';
export const pythonCandidates=(platform=process.platform)=>[process.env.STUDIO_PYTHON,path.resolve('.studio-tools/free-vfx/python',platform==='win32'?'Scripts/python.exe':'bin/python'),...(platform==='win32'?['python3.12',...(process.env.LOCALAPPDATA?[path.join(process.env.LOCALAPPDATA,'Programs/Python/Python312/python.exe')]:[]),'python','python3']:['python3.12','/opt/homebrew/opt/python@3.12/bin/python3.12','/usr/local/opt/python@3.12/bin/python3.12','python3','python'])].filter(Boolean);
