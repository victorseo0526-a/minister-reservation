"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, addMinutes, startOfDay, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface Reservation {
  name: string;
  minister: string;
  time: string;
}

const ministers = [
  { name: '부집행관 (Deputy Executor)', color: 'text-red-600', emoji: '🛡️' },
  { name: '보건부장관 (Minister of Health)', color: 'text-green-600', emoji: '⚕️' },
  { name: '국방부장관 (Minister of Defense)', color: 'text-blue-600', emoji: '🎖️' },
  { name: '전략부장관 (Minister of Strategy)', color: 'text-purple-600', emoji: '📊' },
  { name: '교육부장관 (Minister of Education)', color: 'text-yellow-600', emoji: '📚' },
];

export default function MinisterReservation() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pending, setPending] = useState<Reservation[]>([]);
  const [name, setName] = useState('');
  const [minister, setMinister] = useState(ministers[0].name);
  const [time, setTime] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setReservations((prev) => prev.filter((r: Reservation) => new Date(r.time) > new Date()));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const addReservation = () => {
    if (!name || !time || !minister) return;
    if (reservations.find(r => r.time === time) || pending.find(r => r.time === time)) {
      alert('이미 예약된 시간입니다. 다른 시간을 선택하세요. / Time already reserved. Please choose another.');
      return;
    }

    setPending([...pending, { name, minister, time }]);
    setName('');
    setTime('');
  };

  const approveReservation = (index: number) => {
    const approved = pending[index];
    setReservations([...reservations, approved]);
    setPending(pending.filter((_, i) => i !== index));
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'Hat2378') {
      setAdminMode(true);
    } else {
      alert('비밀번호가 틀렸습니다. / Incorrect password.');
    }
    setAdminPassword('');
  };

  const minDate = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const maxDate = format(addDays(startOfDay(new Date()), 2), "yyyy-MM-dd'T'00:00");

  const generateTimeSlots = () => {
    const slots = [];
    const start = startOfDay(new Date());
    for (let i = 0; i < 48; i++) {
      const slotTime = addMinutes(start, i * 30);
      const slot = reservations.find(r => format(new Date(r.time), 'HH:mm') === format(slotTime, 'HH:mm'));
      slots.push({
        time: format(slotTime, 'HH:mm'),
        reservation: slot
      });
    }
    return slots;
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">장관 신청 예약 시스템 / Minister Reservation System (UK Time)</h1>

      <Card className="mb-4">
        <CardContent className="space-y-2">
          <Input placeholder="이름 입력 / Enter Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="w-full p-2 border rounded" value={minister} onChange={(e) => setMinister(e.target.value)}>
            {ministers.map((m, idx) => (
              <option key={idx} value={m.name}>{m.name}</option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={time}
            min={minDate}
            max={maxDate}
            step="1800"
            onChange={(e) => setTime(e.target.value)}
          />
          {localTime && <p>현지 시간 / Local Time: {localTime}</p>}
          <Button onClick={addReservation}>예약 신청 / Submit Reservation</Button>
        </CardContent>
      </Card>

      {!adminMode && (
        <Card className="mb-4">
          <CardContent className="space-y-2">
            <h2 className="text-lg font-semibold">관리자 로그인 / Admin Login</h2>
            <Input
              type="password"
              placeholder="관리자 비밀번호 입력 / Enter Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <Button onClick={handleAdminLogin}>로그인 / Login</Button>
          </CardContent>
        </Card>
      )}

      {adminMode && (
        <div>
          <h2 className="text-xl font-semibold my-4">예약 신청 대기 (관리자 승인 필요) / Pending Reservations (Admin Approval Required)</h2>
          <div className="space-y-2">
            {pending.map((res, index) => (
              <Card key={index}>
                <CardContent>
                  <p><strong>이름(Name):</strong> {res.name}</p>
                  <p><strong>장관(Minister):</strong> {res.minister}</p>
                  <p><strong>시간(Time):</strong> {format(new Date(res.time), 'yyyy-MM-dd HH:mm')}</p>
                  <Button onClick={() => approveReservation(index)}>수락 / Approve</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold my-4">예약 현황 (장관별) / Reservation Status (by Minister)</h2>
      <div className="space-y-4">
        {ministers.map((m, idx) => (
          <div key={idx}>
            <h3 className={`text-lg font-bold ${m.color}`}>{m.emoji} {m.name}</h3>
            {reservations.filter(res => res.minister === m.name).map((res, index) => (
              <Card key={index} className="mb-2">
                <CardContent>
                  <p><strong>이름(Name):</strong> {res.name}</p>
                  <p><strong>예약 시간(Reservation Time):</strong> {format(new Date(res.time), 'yyyy-MM-dd HH:mm')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold my-4">24시간 시간표 (30분 단위) / 24-Hour Schedule (30 min slots)</h2>
      <div className="grid grid-cols-3 gap-2">
        {generateTimeSlots().map((slot, idx) => (
          <Card key={idx}>
            <CardContent>
              <p className="font-semibold">{slot.time}</p>
              {slot.reservation ? (
                <p>{slot.reservation.minister} - {slot.reservation.name}</p>
              ) : (
                <p>예약 없음 / No Reservation</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}