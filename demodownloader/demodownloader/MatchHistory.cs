using System;
using System.Collections.Generic;

namespace demodownloader
{
    class MatchHistoryPlayer
    {
        public ulong account_id { get; set; }
        public uint player_slot { get; set; }
        public int hero_id { get; set; }
    }

    class MatchHistoryMatch
    {
        public ulong match_id { get; set; }
        public ulong match_seq_num { get; set; }
        public string start_time { get; set; }
        public int lobby_type { get; set; }
        public MatchHistoryPlayer[] players { get; set; }
    }

    class MatchHistory
    {
        public int status { get; set; }
        public string statusDetail { get; set; }
        public int num_results { get; set; }
        public int total_results { get; set; }
        public int results_remaining { get; set; }
        public MatchHistoryMatch[] matches { get; set; }
    }

    class MatchHistoryResult
    {
        public MatchHistory result { get; set; }
    }
}
