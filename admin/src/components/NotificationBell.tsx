import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Link to="/alerts" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
      <span className="text-xl">🔔</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
