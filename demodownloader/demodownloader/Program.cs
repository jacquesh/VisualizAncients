using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

using SteamKit2;

namespace demodownloader
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("Usage\ndemodownloader <steamUsername> <steamPassword>");
                return;
            }

            string username = args[0];
            string password = args[1];

            Dota2Client client = new Dota2Client(username, password);
            client.Connect();
        }
    }
}
