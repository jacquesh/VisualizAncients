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
using System.Linq;

namespace demodownloader
{
    class Dota2Client
    {
        public const int DOTA_APP_ID = 570;

        public int ReceivedReplayCount { get { return receivedReplayURLs.Count; } }

        private SteamClient steam;
        private SteamUser user;

        private CallbackManager manager;
        private SteamGameCoordinator gameCoordinator;

        private bool connected;
        private bool loggedOn;
        private bool welcomed;

        private List<string> receivedReplayURLs;

        public Dota2Client()
        {
            steam = new SteamClient();
            user = steam.GetHandler<SteamUser>();
            manager = new CallbackManager(steam);
            gameCoordinator = steam.GetHandler<SteamGameCoordinator>();

            manager.Subscribe<SteamClient.ConnectedCallback>(onConnect);
            manager.Subscribe<SteamUser.LoggedOnCallback>(onLogon);
            manager.Subscribe<SteamGameCoordinator.MessageCallback>(onMessage);

            connected = false;
            loggedOn = false;
            welcomed = false;

            receivedReplayURLs = new List<string>();
        }

        public void Connect()
        {
            Console.Error.WriteLine("Connecting...");
            SteamDirectory.Initialize().Wait();
            steam.Connect();

            while(!connected)
            {
                manager.RunWaitCallbacks(TimeSpan.FromMilliseconds(100));
            }
        }

        public void LogOn(string userName, string userPassword)
        {
            SteamUser.LogOnDetails userDetails = new SteamUser.LogOnDetails();
            userDetails.Username = userName;
            userDetails.Password = userPassword;
            user.LogOn(userDetails);

            while (!loggedOn)
            {
                manager.RunWaitCallbacks(TimeSpan.FromMilliseconds(100));
            }
        }

        public void OpenDota()
        {
            CMsgClientGamesPlayed.GamePlayed playingDota2 = new CMsgClientGamesPlayed.GamePlayed();
            playingDota2.game_id = new GameID(DOTA_APP_ID);
            ClientMsgProtobuf<CMsgClientGamesPlayed> playMsg = new ClientMsgProtobuf<CMsgClientGamesPlayed>(EMsg.ClientGamesPlayed);
            playMsg.Body.games_played.Add(playingDota2);
            steam.Send(playMsg);

            Thread.Sleep(5000); // TODO: Can we not wait for something a bit more reliable? Like a callback or something?

            ClientGCMsgProtobuf<CMsgClientHello> dotaHello = new ClientGCMsgProtobuf<CMsgClientHello>((uint)EGCBaseClientMsg.k_EMsgGCClientHello);
            dotaHello.Body.engine = ESourceEngine.k_ESE_Source2;
            gameCoordinator.Send(dotaHello, DOTA_APP_ID);

            while (!welcomed)
            {
                manager.RunWaitCallbacks(TimeSpan.FromMilliseconds(100));
            }
        }

        public void RequestReplayURL(ulong matchID)
        {
            ClientGCMsgProtobuf<CMsgGCMatchDetailsRequest> request = new ClientGCMsgProtobuf<CMsgGCMatchDetailsRequest>((uint)EDOTAGCMsg.k_EMsgGCMatchDetailsRequest);
            request.Body.match_id = matchID;
            gameCoordinator.Send(request, DOTA_APP_ID);
        }

        public void WaitForMessages()
        {
            manager.RunWaitCallbacks(TimeSpan.FromMilliseconds(500));
        }

        public string[] ReceivedReplayURLs()
        {
            return receivedReplayURLs.ToArray();
        }

        public void Disconnect()
        {
            user.LogOff();
            steam.Disconnect();
        }

        private void onConnect(SteamClient.ConnectedCallback callback)
        {
            if (callback.Result != EResult.OK)
            {
                Console.Error.WriteLine("ERROR: Unable to connect to steam: {0}", callback.Result);
                return;
            }

            connected = true;
            Console.Error.WriteLine("Connected");
        }

        private void onLogon(SteamUser.LoggedOnCallback callback)
        {
            if (callback.Result != EResult.OK)
            {
                Console.Error.WriteLine("ERROR: Unable to log on: {0}", callback.Result);
                return;
            }

            loggedOn = true;
            Console.Error.WriteLine("Logged on");
        }

        private void onMessage(SteamGameCoordinator.MessageCallback callback)
        {
            Console.Error.WriteLine("Received message: {0}", callback.EMsg);

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
            welcomed = true;
            Console.Error.WriteLine("Welcome received from Game Coordinator");
        }

        private void onMatchDetailsReceived(IPacketGCMsg msg)
        {
            Console.Error.WriteLine("Match Details Received");
            ClientGCMsgProtobuf<CMsgGCMatchDetailsResponse> response = new ClientGCMsgProtobuf<CMsgGCMatchDetailsResponse>(msg);
            if ((EResult)response.Body.result != EResult.OK)
            {
                Console.Error.WriteLine("Unable to request match details: {0}", response.Body.result);
                return;
            }

            CMsgDOTAMatch match = response.Body.match;
            if (match.replay_state != CMsgDOTAMatch.ReplayState.REPLAY_AVAILABLE)
            {
                Console.Error.WriteLine("Replay cannot be downloaded");
                return;
            }

            uint replayCluster = match.cluster;
            ulong matchID = match.match_id;
            uint replaySalt = match.replay_salt;
            string replayURL = String.Format("http://replay{0}.valve.net/{1}/{2}_{3}.dem.bz2", replayCluster, DOTA_APP_ID, matchID, replaySalt);
            receivedReplayURLs.Add(replayURL);
            Console.WriteLine(replayURL);
        }
    }
}
