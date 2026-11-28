#ifndef __SYNBAI_NEWS_FILTER_MQH__
#define __SYNBAI_NEWS_FILTER_MQH__

// Server-side economic-calendar filter for SYNBAI EAs.
// Use with the MQL5 Economic Calendar; no WebRequest or external API is needed.

class CSynbaiNewsFilter
  {
private:
   bool   m_enabled;
   int    m_before_minutes;
   int    m_after_minutes;
   bool   m_high_only;

public:
   void Configure(const bool enabled=true,
                  const int before_minutes=30,
                  const int after_minutes=30,
                  const bool high_only=true)
     {
      m_enabled=enabled;
      m_before_minutes=MathMax(0,before_minutes);
      m_after_minutes=MathMax(0,after_minutes);
      m_high_only=high_only;
     }

   bool IsBlocked(const datetime now,
                  const string currency,
                  string &reason)
     {
      reason="";
      if(!m_enabled || currency=="") return false;

      const datetime from=now-m_after_minutes*60;
      const datetime to=now+m_before_minutes*60;
      MqlCalendarValue values[];
      const int count=CalendarValueHistory(values,from,to,"",currency);
      if(count<=0) return false;

      for(int i=0;i<count;i++)
        {
         MqlCalendarEvent event;
         if(!CalendarEventById(values[i].event_id,event)) continue;
         if(m_high_only && event.importance!=CALENDAR_IMPORTANCE_HIGH) continue;
         if(values[i].time<from || values[i].time>to) continue;

         reason=event.name+" ("+currency+") at "+TimeToString(values[i].time,TIME_DATE|TIME_MINUTES);
         return true;
        }
      return false;
     }

   bool IsBlockedForSymbol(const datetime now,
                           const string symbol,
                           string &reason)
     {
      string base=SymbolInfoString(symbol,SYMBOL_CURRENCY_BASE);
      string profit=SymbolInfoString(symbol,SYMBOL_CURRENCY_PROFIT);
      if(IsBlocked(now,base,reason)) return true;
      if(profit!=base && IsBlocked(now,profit,reason)) return true;
      return false;
     }
  };

#endif
