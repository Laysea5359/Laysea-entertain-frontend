// ฟังก์ชันสั่งสั่นมือถือ (Android ทำงานสมบูรณ์, iOS สงวนสิทธิ์บนเว็บบราวเซอร์)
export const triggerVibration = (type: 'incoming_job' | 'job_accepted' | 'money_released') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'incoming_job') {
        // งานเข้าพาร์ทเนอร์: สั่นกระชั้น 3 จังหวะ
        navigator.vibrate([400, 200, 400, 200, 600]);
      } else if (type === 'job_accepted') {
        // พาร์ทเนอร์รับงาน (แจ้งลูกค้า): สั่น 2 ครั้งกระชับ
        navigator.vibrate([250, 150, 250]);
      } else if (type === 'money_released') {
        // ปล่อยเงินจบงาน: สั่นยาวฉลองเงินเข้า
        navigator.vibrate([200, 100, 200, 100, 500]);
      }
    } catch (e) {
      console.log('Vibration error:', e);
    }
  }
};

// ฟังก์ชันเล่นเสียงแจ้งเตือนผ่าน Web Audio
export const playNotificationSound = (type: 'incoming_job' | 'job_accepted' | 'money_released') => {
  try {
    let soundUrl = '';
    if (type === 'incoming_job') {
      // เสียงกระดิ่ง/เตือนงานเข้า
      soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    } else if (type === 'job_accepted') {
      // เสียงคอนเฟิร์มตอบรับงาน
      soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
    } else if (type === 'money_released') {
      // เสียงเงินเข้าสำเร็จ (Cash register)
      soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';
    }

    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 0.85;
      audio.play().catch((err) => {
        // จัดการกรณีเบราว์เซอร์บล็อก Autoplay หากผู้ใช้ยังไม่ได้คลิกหน้าจอ
        console.log('Audio playback prevented by browser policy:', err);
      });
    }
  } catch (err) {
    console.error('Play sound failed:', err);
  }
};

// รวมคำสั่งเตือนทั้งสั่นและเสียงในบรรทัดเดียว
export const notifyEvent = (type: 'incoming_job' | 'job_accepted' | 'money_released') => {
  triggerVibration(type);
  playNotificationSound(type);
};