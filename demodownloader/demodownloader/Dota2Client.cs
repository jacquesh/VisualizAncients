using System;
using System.Net;
using System.Threading;
using System.Reflection;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

using SteamKit2;
using SteamKit2.Internal; // For the protobuf message type
using SteamKit2.GC;
using SteamKit2.GC.Internal;
using SteamKit2.GC.Dota;
using SteamKit2.GC.Dota.Internal;
using System.IO;
using Newtonsoft.Json;
using System.Linq;

namespace demodownloader
{
    class Dota2Client
    {
        const int DOTA_APP_ID = 570;

        private SteamClient steam;
        private CallbackManager manager;
        private SteamGameCoordinator gameCoordinator;

        private SteamUser user;
        private string userName;
        private string userPassword;
        private List<string> matchIds = new List<string>(); // stores the list of matchIds

        public Dota2Client(string accountName, string accountPassword)
        {
            steam = new SteamClient();
            user = steam.GetHandler<SteamUser>();
            manager = new CallbackManager(steam);
            gameCoordinator = steam.GetHandler<SteamGameCoordinator>();

            manager.Subscribe<SteamClient.ConnectedCallback>(onConnect);
            manager.Subscribe<SteamUser.LoggedOnCallback>(onLogon);
            manager.Subscribe<SteamGameCoordinator.MessageCallback>(onMessage);

            userName = accountName;
            userPassword = accountPassword;
        }

        public void Connect()
        {
            Console.WriteLine("Connecting...");
            SteamDirectory.Initialize().Wait();
            steam.Connect();

            while(true) //TODO: There is a better way to do this
            {
                manager.RunWaitCallbacks(TimeSpan.FromSeconds(1));
            }
        }

        public void DownloadReplay(ulong matchID, uint clusterID, uint replaySalt)
        {
            string replayURL = String.Format("http://replay{0}.valve.net/{1}/{2}_{3}.dem.bz2", clusterID, DOTA_APP_ID, matchID, replaySalt);
            string filePath = String.Format("{0}_{1}.dem.bz2", matchID, replaySalt);
            using (WebClient client = new WebClient())
            {
                client.DownloadFile(replayURL, filePath);
            }
            Console.WriteLine("Download complete!");
        }

        private void onConnect(SteamClient.ConnectedCallback callback)
        {
            if (callback.Result != EResult.OK)
            {
                Console.WriteLine("ERROR: Unable to connect to steam: {0}", callback.Result);
                // TODO: Handle this properly
                return;
            }

            Console.WriteLine("Connected");
            SteamUser.LogOnDetails userDetails = new SteamUser.LogOnDetails();
            userDetails.Username = userName;
            userDetails.Password = userPassword;
            user.LogOn(userDetails);
        }

        private void onLogon(SteamUser.LoggedOnCallback callback)
        {
            if (callback.Result != EResult.OK)
            {
                Console.WriteLine("ERROR: Unable to log in as {0}: {1}", userName, callback.Result);
                // TODO: Handle this properly
                return;
            }

            Console.WriteLine("Logged on");
            CMsgClientGamesPlayed.GamePlayed playingDota2 = new CMsgClientGamesPlayed.GamePlayed();
            playingDota2.game_id = new GameID(DOTA_APP_ID);
            ClientMsgProtobuf<CMsgClientGamesPlayed> playMsg = new ClientMsgProtobuf<CMsgClientGamesPlayed>(EMsg.ClientGamesPlayed);
            playMsg.Body.games_played.Add(playingDota2);
            steam.Send(playMsg);

            Thread.Sleep(5000); // TODO: Can we not wait for something a bit more reliable? Like a callback or something?

            ClientGCMsgProtobuf<CMsgClientHello> someMsg = new ClientGCMsgProtobuf<CMsgClientHello>((uint)EGCBaseClientMsg.k_EMsgGCClientHello);
            someMsg.Body.engine = ESourceEngine.k_ESE_Source2;
            gameCoordinator.Send(someMsg, DOTA_APP_ID);
        }

        private void onMessage(SteamGameCoordinator.MessageCallback callback)
        {
            Console.WriteLine("Received message: {0}", callback.EMsg);

            Dictionary<uint, Action<IPacketGCMsg>> msgMap = new Dictionary<uint, Action<IPacketGCMsg>>();
            msgMap[(uint)EGCBaseClientMsg.k_EMsgGCClientWelcome] = onWelcomeReceived;
            msgMap[(uint)EDOTAGCMsg.k_EMsgGCMatchDetailsResponse] = onMatchDetailsReceived;

            if (msgMap.ContainsKey(callback.EMsg))
            {
                msgMap[callback.EMsg](callback.Message);
            }
        }

       

        private void onWelcomeReceived(IPacketGCMsg msg)
        {
            ClientGCMsgProtobuf<CMsgGCMatchDetailsRequest> request = new ClientGCMsgProtobuf<CMsgGCMatchDetailsRequest>((uint)EDOTAGCMsg.k_EMsgGCMatchDetailsRequest);
            RunAsync("57934473", true).Wait();
            List<string> temp = matchIds.Distinct().ToList();
            foreach (string x in temp)
            {
                Console.WriteLine(x);
            }
            //just write out the list of match IDs for now. can move the next two lines up into loop when on UCT net.
            request.Body.match_id = 2215232850;
            gameCoordinator.Send(request, DOTA_APP_ID);
        }

        async Task RunAsync(string pID, bool cont)
        {
            string steamAPI = "?key=956B29B784D225393DA5B57301BF7E24";
            string playerID = pID;
            int numberOfMatches = 2; // small for testing purposes; larger number -> more matches
            
            using (var client = new HttpClient())
            {
                client.BaseAddress = new Uri("http://localhost:9000/");
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/"+ steamAPI +"&account_id=" + playerID + "&Matches_Requested="+numberOfMatches+"&format=json";
                HttpResponseMessage response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                { 
                    var responseValue = string.Empty;
                    Task task = response.Content.ReadAsStreamAsync().ContinueWith(t =>
                    {
                        var stream = t.Result;
                        using (var reader = new StreamReader(stream))
                        {
                            responseValue = reader.ReadToEnd();
                        }
                    });
                    task.Wait();
                    JObject results = JObject.Parse(responseValue);
                    for (int i =0; i < numberOfMatches; i++)
                    {
                        if (((string)results["result"]["status"]).Equals("1")) // check user is letting us get their history
                        {
                            string matches = (string)results["result"]["matches"][0]["match_id"];
                            if (cont) // only flood one level down, otherwise it just doesn't stop
                            {
                                for (int j = 0; j < 10; j++)
                                {
                                    string playerIDx = (string)results["result"]["matches"][i]["players"][j]["account_id"];
                                    RunAsync(playerIDx, false).Wait();
                                }
                            }
                            matchIds.Add(matches);
                        }
                    }
                }
            }

        }

        private void onMatchDetailsReceived(IPacketGCMsg msg)
        {
            ClientGCMsgProtobuf<CMsgGCMatchDetailsResponse> response = new ClientGCMsgProtobuf<CMsgGCMatchDetailsResponse>(msg);
            if ((EResult)response.Body.result != EResult.OK)
            {
                Console.WriteLine("Unable to request match details: {0}", response.Body.result);
                return;
            }

            CMsgDOTAMatch match = response.Body.match;
            //Lazy reflection, copied from SteamKit dota example:
            var fields = typeof(CMsgDOTAMatch).GetProperties(BindingFlags.Public | BindingFlags.Instance);
            foreach (var field in fields)
            {
                var value = field.GetValue(match, null);

                Console.WriteLine("{0}: {1}", field.Name, value);
            }

            if (match.replay_state != CMsgDOTAMatch.ReplayState.REPLAY_AVAILABLE)
            {
                Console.WriteLine("Replay unable, cannot download");
                return;
            }

            uint replayCluster = match.cluster;
            ulong matchID = match.match_id;
            uint replaySalt = match.replay_salt;
            string replayURL = String.Format("http://replay{0}.valve.net/{1}/{2}_{3}.dem.bz2", replayCluster, DOTA_APP_ID, matchID, replaySalt);
            Console.WriteLine("Replay is available @ {0}, downloading", replayURL);
            //DownloadReplay(matchID, replayCluster, replaySalt);

            steam.Disconnect();
        }
    }
}
