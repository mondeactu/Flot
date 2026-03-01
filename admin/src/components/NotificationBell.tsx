import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { count: c } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('acknowledged', false);
      setCount(c ?? 0);
    };

    fetch();

    const channel = supabase
      .channel('alerts-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Link to="/alerts" className="relative p-2.5 hover:bg-surface rounded-xl transition-colors">
      <Bell size={19} className="text-ink-secondary" />
      {count > 0 && (
        <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 shadow-sm">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
