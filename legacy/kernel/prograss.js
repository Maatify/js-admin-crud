/**
 * Created by Maatify.dev
 * User: Maatify.dev
 * Date: 2026-05-14
 * Time: 11:20 AM
 * https://www.Maatify.dev
 */

let timer   = null;
let current = 0;

const CIRCUMFERENCE = 2 * Math.PI * 45; // ≈ 283

const overlay   = document.getElementById('progress-overlay');
const circleFill = document.getElementById('circle-fill');
const pctText   = document.getElementById('circle-pct');
const label     = document.getElementById('overlay-label');

function setProgress(value) {
    const offset = CIRCUMFERENCE - (CIRCUMFERENCE * value / 100);
    circleFill.style.strokeDashoffset = offset;
    pctText.textContent = Math.round(value) + '%';
}

// ✅ Start — يشغل الأوفرلاي ويبدأ من قيمة معينة (default: 0)
function startProgress(from = 0) {
    stopProgress();
    current = from;
    setProgress(current);
    label.textContent = 'loading...';
    overlay.classList.add('active');

    timer = setInterval(() => {
        current += 0.8;
        if (current >= 100) {
            current = 100;
            setProgress(100);
            label.textContent = 'Done✓';
            clearInterval(timer);
            timer = null;
            setTimeout(() => overlay.classList.remove('active'), 900);
            return;
        }
        setProgress(current);
    }, 30);
}

// ✅ Stop — يوقف الأوفرلاي فورًا
function stopProgress() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    overlay.classList.remove('active');
    current = 0;
    setProgress(0);
}
