using System;
using System.Collections.Generic;
using System.Net;
using System.IO;

using Newtonsoft.Json;

namespace demodownloader
{
    class Program
    {
        private const string apiKey = "EF72B1C786E9F73A7E40DFDC60622356";

        static HashSet<ulong> getMatchIDList(int targetMatchCount, ulong startAccountID)
        {
            HashSet<ulong> matchIDSet = new HashSet<ulong>();
            HashSet<ulong> seenPlayers = new HashSet<ulong>();

            Queue<MatchHistoryMatch> matchQueue = new Queue<MatchHistoryMatch>();
            Queue<ulong> accountQueue = new Queue<ulong>();

            accountQueue.Enqueue(startAccountID);
            seenPlayers.Add(startAccountID);

            while (true)
            {
                // Get matches for all the queued players
                while (accountQueue.Count > 0)
                {
                    ulong nextAccount = accountQueue.Dequeue();
                    string matchCount = "10";
                    string url = String.Format("https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key={0}&format=json&account_id={1}&Matches_Requested={2}",
                                                apiKey, nextAccount, matchCount);
                    WebRequest request = WebRequest.Create(url);
                    request.Method = "GET";
                    using (WebResponse response = request.GetResponse())
                    {
                        Stream responseStream = response.GetResponseStream();
                        StreamReader responseReader = new StreamReader(responseStream);
                        string responseStr = responseReader.ReadToEnd();
                        MatchHistory result = JsonConvert.DeserializeObject<MatchHistoryResult>(responseStr).result;
                        if (result.status != 1)
                        {
                            Console.Error.WriteLine("Player {0} won't let us get their match history!", nextAccount);
                            continue;
                        }

                        Console.Error.WriteLine("Received {0} match IDs", result.num_results);
                        foreach (MatchHistoryMatch m in result.matches)
                        {
                            if (!matchIDSet.Contains(m.match_id))
                            {
                                matchIDSet.Add(m.match_id);
                                matchQueue.Enqueue(m);
                            }
                        }
                    }

                    if (matchIDSet.Count >= targetMatchCount)
                    {
                        break;
                    }
                }

                if (matchIDSet.Count >= targetMatchCount)
                {
                    break;
                }

                while (matchQueue.Count > 0)
                {
                    MatchHistoryMatch nextMatch = matchQueue.Dequeue();
                    foreach (MatchHistoryPlayer p in nextMatch.players)
                    {
                        if (!seenPlayers.Contains(p.account_id))
                        {
                            seenPlayers.Add(p.account_id);
                            accountQueue.Enqueue(p.account_id);
                        }
                    }
                }
            }

            return matchIDSet;
        }

        static HashSet<ulong> loadMatchIDList(string filename)
        {
            HashSet<ulong> matchIDSet = new HashSet<ulong>();
            using (FileStream fileIn = new FileStream(filename, FileMode.Open))
            {
                StreamReader read = new StreamReader(fileIn);
                while (!read.EndOfStream)
                {
                    string matchIDString = read.ReadLine();
                    ulong matchID = ulong.Parse(matchIDString);
                    matchIDSet.Add(matchID);
                }
            }

            return matchIDSet;
        }

        static void Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("Usage\ndemodownloader <steamUsername> <steamPassword>");
                return;
            }

            string username = args[0];
            string password = args[1];

            Dota2Client client = new Dota2Client();

            ulong startAccountID = 4281729;
            int targetMatchCount = 1000;
            HashSet<ulong> matchIDSet = getMatchIDList(targetMatchCount, startAccountID);
            //HashSet<ulong> matchIDSet = loadMatchIDList("matchIDsD3zmodos.txt");
            Console.Error.WriteLine("Found {0} distinct matches!", matchIDSet.Count);

            client.Connect();
            client.LogOn(username, password);
            client.OpenDota();

            foreach(ulong id in matchIDSet)
            {
                client.RequestReplayURL(id);
            }

            Console.Error.WriteLine("Waiting for receipt of replays, press 'q' to stop waiting and print, or press 'n' to print the number received so far");
            int urlsRequested = matchIDSet.Count;
            bool receiving = true;
            while (receiving)
            {
                if (Console.KeyAvailable)
                {
                    ConsoleKeyInfo key = Console.ReadKey(true);
                    if (key.Key == ConsoleKey.Q)
                    {
                        receiving = false;
                    }
                    else if (key.Key == ConsoleKey.N)
                    {
                        Console.Error.WriteLine("We have currently received {0} replays, out of an expected {1}", client.ReceivedReplayCount, urlsRequested);
                    }
                }
                if (client.ReceivedReplayCount >= urlsRequested)
                {
                    receiving = false;
                }
                client.WaitForMessages();
            }

            Console.WriteLine("Received replay URLs are:");
            string[] urls = client.ReceivedReplayURLs();
            foreach (string url in urls)
            {
                Console.WriteLine(url);
            }

            client.Disconnect();
        }
    }
}
