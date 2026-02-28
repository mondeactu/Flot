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
    <Link to="/alerts" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
      <Bell size={20} className="text-gray-500" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
