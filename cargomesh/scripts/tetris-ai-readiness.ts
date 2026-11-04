import {inspectTetrisReadiness} from '../src/server/ai/meta/tetris-readiness';
const report=inspectTetrisReadiness(process.env,{localOnly:process.argv.includes('--local')});
console.log(JSON.stringify(report,null,2));
process.exitCode=report.status==='CONFIGURATION_INCOMPLETE'?2:0;
