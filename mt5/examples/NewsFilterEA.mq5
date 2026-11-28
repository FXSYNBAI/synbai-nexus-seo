#property strict
#include "..\\include\\SYNBAI_NewsFilter.mqh"

input bool InpAvoidHighImpactNews=true;
input int  InpNewsMinutesBefore=30;
input int  InpNewsMinutesAfter=30;

CSynbaiNewsFilter NewsFilter;

int OnInit()
  {
   NewsFilter.Configure(InpAvoidHighImpactNews,
                        InpNewsMinutesBefore,
                        InpNewsMinutesAfter,
                        true);
   return INIT_SUCCEEDED;
  }

void OnTick()
  {
   string reason;
   if(NewsFilter.IsBlockedForSymbol(TimeCurrent(),_Symbol,reason))
     {
      Comment("Trading paused for high-impact news: ",reason);
      return;
     }

   // Call the strategy's normal entry logic here.
  }
