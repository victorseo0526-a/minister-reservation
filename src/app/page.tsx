"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, addMinutes, startOfDay, addDays, isAfter } from 'date-fns';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../../lib/firebase';

const ministers = [
  { name: '부집행관 (Deputy Executor)', color: 'text-red-600', emoji: '🛡️' },
  { name: '보건부장관 (Minister of Health)', color: 'text-green-600', emoji: '⚕️' },
  { name: '국방부장관 (Minister of Defense)', color: 'text-blue-600', emoji: '🎖️' },
  { name: '전략부장관 (Minister of Strategy)', color: 'text-purple-600', emoji: '📊' },
  { name: '교육부장관 (Minister of Education)', color: 'text-yellow-600', emoji: '📚' },
];

// 30분 단위만 입력 허용, 00분, 30분만 선택
function normalizeTimeToStep(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  d.setSeconds(0);
  d.setMilliseconds(0);
  if (d.getMinutes() >= 30) d.setMinutes(30);
  else d.setMinutes(0);
  return d.toISOString().slice(0, 16);
}

export default function MinisterReservation() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [minister, setMinister] = useState(ministers[0].name);
  const [time, setTime] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [myReservations, setMyReservations] = useState<any[]>([]);

  // Firestore 데이터 불러오기
  const fetchReservations = async () => {
    const snapshot = await getDocs(collection(db, "reservations"));
    const all: any[] = [];
    snapshot.forEach(docu => {
      all.push({ id: docu.id, ...docu.data() });
    });
    const now = new Date();
    // 24시간(1440분) 지난 예약 자동 삭제
    all.forEach(async (res) => {
      if (isAfter(now, addMinutes(new Date(res.time), 1440))) {
        if (res.id) await deleteDoc(doc(db, "reservations", res.id));
      }
    });
    setReservations(all.filter(r => r.status === "approved"));
    setPending(all.filter(r => r.status === "pending"));
    setRejected(all.filter(r => r.status === "rejected"));
    setMyReservations(
      name
        ? all
            .filter(r => r.name === name)
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        : []
    );
  };

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 60000);
    return () => clearInterval(interval);
  }, [name]);

  // 예약 중복 로직 (조건을 모두 체크)
  const isDuplicate = (name: string, minister: string, time: string): boolean => {
    const all = [...reservations, ...pending];
    const dateOnly = time.split('T')[0];
    // 1. 동일 이름+동일 장관+동일 시간(완전중복) 불가
    if (all.some(r => r.name === name && r.minister === minister && r.time === time)) return true;
    // 2. 동일 이름+다른 장관+동일 시간(이름/시간만 동일) 불가
    if (all.some(r => r.name === name && r.time === time)) return true;
    // 3. 동일 이름이 같은 날짜에 이미 예약(장관/시간 상관없이)
    if (all.some(r => r.name === name && r.time && r.time.split('T')[0] === dateOnly)) return true;
    // 4. 다른 이름+동일 장관+동일 시간(누가 하든 한 장관 한 시간)
    if (all.some(r => r.minister === minister && r.time === time)) return true;
    return false;
  };

  const getTimeInputStep = () => 1800;
  const getValidTimeValue = (input: string) => {
    if (!input) return input;
    const d = new Date(input);
    let mins = d.getMinutes();
    if (mins !== 0 && mins !== 30) {
      d.setMinutes(mins < 30 ? 0 : 30, 0, 0);
    }
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  // 예약 신청
  const addReservation = async () => {
    if (!name || !time || !minister) return;
    const normTime = normalizeTimeToStep(time);
    if (!normTime) {
      alert("시간 형식이 잘못되었습니다.");
      return;
    }
    if (isDuplicate(name, minister, normTime)) {
      alert('중복 예약 조건에 해당되어 예약할 수 없습니다.');
      return;
    }
    await addDoc(collection(db, "reservations"), {
      name,
      minister,
      time: normTime,
      status: "pending",
      created: new Date().toISOString(),
    });
    // 입력값은 남겨서, 예약 후 내 예약 현황 계속 보이게
    // setName('');
    setTime('');
    fetchReservations();
  };

  // 승인
  const approveReservation = async (id?: string) => {
    await fetchReservations();
    const exists = pending.find((item) => item.id === id);
    if (!exists) {
      alert("예약이 이미 삭제되었거나 만료되었습니다. 새로고침 해주세요.");
      return;
    }
    try {
      await updateDoc(doc(db, "reservations", id!), { status: "approved" });
      fetchReservations();
    } catch (e) {
      alert("승인 중 에러가 발생했습니다. 새로고침 후 다시 시도하세요.");
      fetchReservations();
    }
  };

  // 거절
  const rejectReservation = async (id?: string) => {
    await fetchReservations();
    const exists = pending.find((item) => item.id === id);
    if (!exists) {
      alert("예약이 이미 삭제되었거나 만료되었습니다. 새로고침 해주세요.");
      return;
    }
    try {
      await updateDoc(doc(db, "reservations", id!), { status: "rejected" });
      fetchReservations();
    } catch (e) {
      alert("거절 중 에러가 발생했습니다. 새로고침 후 다시 시도하세요.");
      fetchReservations();
    }
  };

  // 삭제
  const deleteReservation = async (id?: string) => {
    await fetchReservations();
    const exists =
      reservations.find((item) => item.id === id) ||
      pending.find((item) => item.id === id) ||
      rejected.find((item) => item.id === id);
    if (!exists) {
      alert("이미 삭제된 예약입니다. 새로고침 해주세요.");
      return;
    }
    try {
      await deleteDoc(doc(db, "reservations", id!));
      fetchReservations();
    } catch (e) {
      alert("삭제 중 에러가 발생했습니다. 새로고침 후 다시 시도하세요.");
      fetchReservations();
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'Hat2378') setAdminMode(true);
    else alert('비밀번호가 틀렸습니다.');
    setAdminPassword('');
  };

  const minDate = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const maxDate = format(addDays(startOfDay(new Date()), 2), "yyyy-MM-dd'T'00:00");

  // 시간표 30분 단위만 출력(오늘)
  const generateTimeSlots = () => {
    const slots = [];
    const start = startOfDay(new Date());
    for (let i = 0; i < 48; i++) {
      const slotTime = addMinutes(start, i * 30);
      const slotList = reservations.filter(r => format(new Date(r.time), 'HH:mm') === format(slotTime, 'HH:mm'));
      slots.push({
        time: format(slotTime, 'HH:mm'),
        reservations: slotList,
      });
    }
    return slots;
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">장관 신청 예약 시스템 / Minister Reservation System (UK Time)</h1>
      <Card className="mb-4">
        <CardContent className="space-y-2">
          <Input placeholder="이름 입력 / Enter Name" value={name} onChange={e => setName(e.target.value)} />
          <select className="w-full p-2 border rounded" value={minister} onChange={e => setMinister(e.target.value)}>
            {ministers.map((m, idx) => (
              <option key={idx} value={m.name}>{m.name}</option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={time}
            min={minDate}
            max={maxDate}
            step={getTimeInputStep()}
            onChange={e => setTime(getValidTimeValue(e.target.value))}
          />
          <Button onClick={addReservation}>예약 신청 / Submit Reservation</Button>
        </CardContent>
      </Card>
      
      {/* 💙 내 예약 현황 표시 */}
      {name && myReservations.length > 0 && (
        <div className="my-6">
          <h2 className="text-lg font-semibold">내 예약 현황 / My Reservations</h2>
          {myReservations.map((res, idx) => (
            <Card key={idx} className="mb-2">
              <CardContent>
                <p>
                  <span className="text-blue-600 font-bold">{res.minister}</span>
                  <span className="ml-2">{format(new Date(res.time), 'yyyy-MM-dd HH:mm')}</span>
                </p>
                <p>
                  상태:{" "}
                  <span
                    className={
                      res.status === "approved"
                        ? "text-green-600"
                        : res.status === "pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }
                  >
                    {res.status === 'approved' ? '승인됨' : res.status === 'pending' ? '대기중' : '거절됨'}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!adminMode && (
        <Card className="mb-4">
          <CardContent className="space-y-2">
            <h2 className="text-lg font-semibold">관리자 로그인 / Admin Login</h2>
            <Input
              type="password"
              placeholder="관리자 비밀번호 입력 / Enter Admin Password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
            />
            <Button onClick={handleAdminLogin}>로그인 / Login</Button>
          </CardContent>
        </Card>
      )}

      {adminMode && (
        <div>
          <h2 className="text-xl font-semibold my-4">예약 신청 대기 (관리자 승인/거절 가능)</h2>
          <div className="space-y-2">
            {pending.map((res: any) => (
              <Card key={res.id}>
                <CardContent>
                  <p>
                    <strong className="text-blue-600">이름(Name): {res.name}</strong>
                  </p>
                  <p>
                    <strong>장관(Minister):</strong> {res.minister}
                  </p>
                  <p>
                    <strong>시간(Time):</strong> {format(new Date(res.time), 'yyyy-MM-dd HH:mm')}
                  </p>
                  <Button onClick={() => approveReservation(res.id)}>수락 / Approve</Button>
                  <Button onClick={() => rejectReservation(res.id)} variant="outline" className="ml-2">거절 / Reject</Button>
                  <Button onClick={() => deleteReservation(res.id)} variant="destructive" className="ml-2">삭제 / Delete</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <h2 className="text-xl font-semibold my-4">거절된 예약 / Rejected Reservations</h2>
          <div className="space-y-2">
            {rejected.map((res: any) => (
              <Card key={res.id}>
                <CardContent>
                  <p>
                    <strong className="text-blue-600">이름(Name): {res.name}</strong>
                  </p>
                  <p>
                    <strong>장관(Minister):</strong> {res.minister}
                  </p>
                  <p>
                    <strong>시간(Time):</strong> {format(new Date(res.time), 'yyyy-MM-dd HH:mm')}
                  </p>
                  <Button onClick={() => deleteReservation(res.id)} variant="destructive">삭제 / Delete</Button>
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
            {reservations.filter(res => res.minister === m.name).map((res: any) => (
              <Card key={res.id} className="mb-2">
                <CardContent>
                  <p>
                    <strong className="text-blue-600">이름(Name): {res.name}</strong>
                  </p>
                  <p>
                    <strong>예약 시간(Reservation Time):</strong> {format(new Date(res.time), 'yyyy-MM-dd HH:mm')}
                  </p>
                  {adminMode && (
                    <Button onClick={() => deleteReservation(res.id)} variant="destructive">삭제 / Delete</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold my-4">24시간 시간표 (30분 단위)</h2>
      <div className="grid grid-cols-3 gap-2">
        {generateTimeSlots().map((slot, idx) => (
          <Card key={idx}>
            <CardContent>
              <p className="font-semibold">{slot.time}</p>
              {slot.reservations.length > 0 ? (
                slot.reservations.map((r, i) => (
                  <p key={i}>
                    <span className="text-blue-600 font-bold underline bg-yellow-100 px-2 rounded">
                      {r.name}
                    </span> - {r.minister}
                  </p>
                ))
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
