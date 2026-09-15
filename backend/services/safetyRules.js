/**
 * SAHAY Official Disaster Safety Rules Engine
 * Predefined, verified safety rules based on KSDMA & NDMA disaster management protocols.
 * The LLM must not override or omit critical safety rules.
 */

const SAFETY_RULES = {
  FLOOD: {
    disasterType: 'FLOOD',
    title: 'Flood Emergency Safety Protocols',
    summary: 'Water inundation poses severe risks of electrocution, structural destabilization, and contamination.',
    immediateActions: [
      'Move to higher ground or upper floors immediately.',
      'Turn off the main electricity switch and LPG gas cylinders ONLY if safe and dry.',
      'Never walk, swim, or drive through moving floodwater (just 15 cm of moving water can knock you down).',
      'Boil all drinking water thoroughly before consuming to prevent water-borne disease.',
      'Keep your mobile phone on battery saver mode and keep an emergency bag ready with medicines and documents.',
      'If trapped and unable to evacuate safely, move to the roof, display a bright cloth, and request immediate rescue.'
    ],
    doNotDo: [
      'Do NOT touch electrical switches, meters, or fallen cables while wet or standing in water.',
      'Do NOT drink floodwater or consume food that has touched floodwaters.',
      'Do NOT attempt to drive through flooded roads or bridges under water.'
    ],
    malayalam: {
      title: 'പ്രളയ സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ',
      immediateActions: [
        'ഉയർന്ന പ്രദേശങ്ങളിലേക്കോ വീടിന്റെ മുകൾനിലയിലേക്കോ ഉടനടി മാറുക.',
        'സുരക്ഷിതമെങ്കിൽ മെയിൻ സ്വിച്ചും ഗ്യാസ് സിലിണ്ടറും ഓഫ് ചെയ്യുക.',
        'ഒഴുക്കുള്ള വെള്ളത്തിലൂടെ നടക്കാനോ വാഹനം ഓടിക്കാനോ ശ്രമിക്കരുത്.',
        'തിളപ്പിച്ചാറിയ വെള്ളം മാത്രം കുടിക്കുക.',
        'വീട്ടിൽ ഒറ്റപ്പെട്ടുപോയാൽ ടെറസ്സിൽ കയറി സഹായം അഭ്യർത്ഥിക്കുക അല്ലെങ്കിൽ SOS അയക്കുക.'
      ]
    },
    helplines: [
      { name: 'Kerala Police / ERSS', number: '112' },
      { name: 'District Disaster Control Room', number: '1077' },
      { name: 'State Disaster Control Room', number: '1070' },
      { name: 'Fire & Rescue Service', number: '101' }
    ]
  },

  LANDSLIDE: {
    disasterType: 'LANDSLIDE',
    title: 'Landslide & Debris Flow Safety Protocols',
    summary: 'Hilly slopes in Wayanad, Idukki, and Western Ghats catchments are vulnerable to sudden slope failure during torrential rain.',
    immediateActions: [
      'Evacuate immediately away from the path of the landslide or debris flow.',
      'Watch for warning signs: slope cracks, soil bulges, tilting trees or utility poles, and sudden muddiness in stream water.',
      'Move to designated community relief shelters or flat valley areas away from steep slopes.',
      'Stay alert during nighttime when rumbling sounds or tree cracks may be audible.',
      'Avoid riverbanks and narrow valleys where debris flows may pool or surge downstream.'
    ],
    doNotDo: [
      'Do NOT return to an evacuated landslide area until district authorities declare it structurally safe.',
      'Do NOT approach steep cut slopes or mud embankments during persistent heavy rainfall.',
      'Do NOT use mountain pass roads (ghat roads) during Red/Orange alerts unless officially cleared.'
    ],
    malayalam: {
      title: 'ഉരുൾപൊട്ടൽ സുരക്ഷാ നിർദ്ദേശങ്ങൾ',
      immediateActions: [
        'ഉരുൾപൊട്ടൽ സാധ്യതയുള്ള ചരിവുകളിൽ നിന്ന് ഉടനടി സുരക്ഷിത സ്ഥാനങ്ങളിലേക്ക് മാറുക.',
        'മണ്ണിൽ വിള്ളലുകൾ, മരങ്ങൾ ചരിഞ്ഞു നിൽക്കൽ, അരുവികളിൽ പെട്ടെന്ന് കലക്കവെള്ളം വരിക എന്നിവ ശ്രദ്ധിക്കുക.',
        'രാത്രികാലങ്ങളിൽ അസാധാരണമായ ശബ്ദങ്ങൾ കേട്ടാൽ ഉടൻ സുരക്ഷിത കേന്ദ്രത്തിലേക്ക് മാറുക.',
        'ഉരുൾപൊട്ടിയ പ്രദേശങ്ങളിലേക്ക് ഒരിക്കലും തിരികെ പോകരുത്.'
      ]
    },
    helplines: [
      { name: 'District Disaster Control Room (DDMA)', number: '1077' },
      { name: 'Emergency Response', number: '112' },
      { name: 'Forest & Wildlife Emergency', number: '1926' }
    ]
  },

  HEAVY_RAIN: {
    disasterType: 'HEAVY_RAIN',
    title: 'Heavy Rainfall & Cyclone Advisory',
    summary: 'Intense precipitation can trigger sudden flash floods, water-logging, and tree falls.',
    immediateActions: [
      'Stay indoors and avoid unnecessary travel, especially through waterlogged stretches or ghat roads.',
      'Keep away from rivers, reservoirs, and coastal waters where currents are dangerously fast.',
      'Keep emergency flashlights, battery backup powerbanks, and essential medications stocked.',
      'Secure loose roofing sheets, tiles, and outdoor objects from wind gusts.',
      'Monitor official SAHAY and KSDMA weather advisories regularly.'
    ],
    doNotDo: [
      'Do NOT park vehicles under large trees, unstable hoardings, or electric lines.',
      'Do NOT take shelter under isolated trees during thunderstorm activity.'
    ],
    malayalam: {
      title: 'ശക്തമായ മഴ ജാഗ്രതാനിർദ്ദേശങ്ങൾ',
      immediateActions: [
        'അത്യാവശ്യമല്ലാത്ത യാത്രകൾ പൂർണ്ണമായും ഒഴിവാക്കുക.',
        'നദികൾ, തോടുകൾ, ജലാശയങ്ങൾ എന്നിവയ്ക്കടുത്തേക്ക് പോകരുത്.',
        'വൈദ്യുതി പോസ്റ്റുകൾ, മരങ്ങൾ എന്നിവയ്ക്ക് താഴെ വാഹനം പാർക്ക് ചെയ്യരുത്.',
        'ഫോൺ ചാർജ്ജ് കരുതുകയും ടോർച്ച് പോലുള്ളവ കയ്യിൽ കരുതുകയും ചെയ്യുക.'
      ]
    },
    helplines: [
      { name: 'KSEB Electricity Emergency', number: '1912' },
      { name: 'Disaster Helpline', number: '1077' },
      { name: 'Emergency Desk', number: '112' }
    ]
  },

  FIRE: {
    disasterType: 'FIRE',
    title: 'Fire Emergency Safety Protocols',
    summary: 'Rapid flame propagation, toxic smoke inhalation, and heat exhaustion are the primary hazards.',
    immediateActions: [
      'Evacuate the building immediately using stairs; NEVER use elevators.',
      'Crawl low under smoke—cleaner, cooler air remains near the floor.',
      'If your clothes catch fire: Stop, Drop, and Roll.',
      'Call Fire & Rescue (101) and Kerala Police (112) immediately after reaching safety.',
      'Check doors for heat with the back of your hand before opening.'
    ],
    doNotDo: [
      'Do NOT re-enter a burning building for valuables or pets.',
      'Do NOT use water on electrical or oil fires (use sand, dry powder, or fire blanket).'
    ],
    malayalam: {
      title: 'തീപിടുത്തം സുരക്ഷാ നിർദ്ദേശങ്ങൾ',
      immediateActions: [
        'ഉടൻതന്നെ കെട്ടിടത്തിന് പുറത്തേക്ക് കടക്കുക, ലിഫ്റ്റ് ഉപയോഗിക്കരുത്.',
        'പുക നിറഞ്ഞ മുറികളിൽ നിലത്തുകൂടി ഇഴഞ്ഞു നീങ്ങുക.',
        'വസ്ത്രത്തിൽ തീപിടിച്ചാൽ ഓടാതെ നിലത്തുരുളുക.',
        'ഫയർഫോഴ്സ് (101) നമ്പറിൽ ഉടൻ വിളിക്കുക.'
      ]
    },
    helplines: [
      { name: 'Fire & Rescue Service', number: '101' },
      { name: 'Ambulance', number: '108' },
      { name: 'Emergency Police ERSS', number: '112' }
    ]
  },

  BUILDING_DAMAGE: {
    disasterType: 'BUILDING_DAMAGE',
    title: 'Structural Collapse & Building Damage Protocols',
    summary: 'Damaged load-bearing walls or foundation cracks present imminent collapse hazard.',
    immediateActions: [
      'Evacuate all occupants immediately into an open area away from structures and overhead cables.',
      'Shut off main electrical supply and gas connections from outside if safe.',
      'If trapped under rubble, tap repeatedly on a pipe or wall so rescuers can pinpoint your location.',
      'Cover your mouth with a cloth to avoid inhaling toxic dust and concrete particles.'
    ],
    doNotDo: [
      'Do NOT use open flames, candles, or matches due to potential gas leakages.',
      'Do NOT shout continuously to avoid wasting oxygen and inhaling dust.'
    ],
    malayalam: {
      title: 'കെട്ടിട അപകട നിർദ്ദേശങ്ങൾ',
      immediateActions: [
        'തകർച്ചാ സാധ്യതയുള്ള കെട്ടിടങ്ങളിൽ നിന്ന് ആളുകളെ ഉടനടി ഒഴിപ്പിക്കുക.',
        'കെട്ടിടാവശിഷ്ടങ്ങൾക്കിടയിൽ കുടുങ്ങിയാൽ ശബ്ദമുണ്ടാക്കി രക്ഷാപ്രവർത്തകരുടെ ശ്രദ്ധ ആകർഷിക്കുക.',
        'തുണികൊണ്ട് മൂക്കും വായും മൂടുക.'
      ]
    },
    helplines: [
      { name: 'Emergency Helpline', number: '112' },
      { name: 'Disaster Control', number: '1077' },
      { name: 'Fire & Rescue', number: '101' }
    ]
  },

  MEDICAL_EMERGENCY: {
    disasterType: 'MEDICAL_EMERGENCY',
    title: 'Medical Emergency & First Aid Protocols',
    summary: 'Immediate trauma stabilization and rapid transit to accredited medical care.',
    immediateActions: [
      'Dial 108 for Emergency Medical Services (Ambulance) immediately.',
      'Check vital signs (responsiveness, breathing, pulse).',
      'For severe bleeding, apply firm direct pressure with a clean cloth.',
      'If the person is unconscious and not breathing normally, begin Hands-Only CPR if trained.',
      'Keep the patient calm, warm, and lying down until medical help arrives.'
    ],
    doNotDo: [
      'Do NOT move a victim with suspected spinal or neck injury unless in imminent danger of fire/flood.',
      'Do NOT give food or water to an unconscious or drowsy patient.'
    ],
    malayalam: {
      title: 'മെഡിക്കൽ എമർജൻസി നിർദ്ദേശങ്ങൾ',
      immediateActions: [
        '108 ആംബുലൻസ് നമ്പറിലേക്ക് ഉടൻ വിളിക്കുക.',
        'മുറിവുകളിൽ നിന്ന് രക്തം വാർന്നുപോകുന്നുവെങ്കിൽ വൃത്തിയുള്ള തുണികൊണ്ട് അമർത്തിപ്പിടിക്കുക.',
        'കഴുത്തിനോ നട്ടെല്ലിനോ പരിക്കേറ്റവരെ അനാവശ്യമായി അനക്കരുത്.'
      ]
    },
    helplines: [
      { name: 'Free Ambulance Service (EMS)', number: '108' },
      { name: 'Disha Health Helpline (Kerala)', number: '1056' },
      { name: 'Emergency Services', number: '112' }
    ]
  },

  ROAD_BLOCKAGE: {
    disasterType: 'ROAD_BLOCKAGE',
    title: 'Road Blockage & Safe Travel Advisory',
    summary: 'Fallen trees, mudslides, or high water make transport corridors impassable.',
    immediateActions: [
      'Stop your vehicle safely away from steep embankments or swollen culverts.',
      'Do not attempt to push through blocked sections; reverse carefully to a safe clearing.',
      'Use the SAHAY Safe Route & Evacuation feature on the Live Map to discover cleared detours.',
      'Report the location of the blockage to the Traffic Cell or District Control Room (1077).'
    ],
    doNotDo: [
      'Do NOT cross bridges that are submerged or experiencing turbulent overtopping.'
    ],
    malayalam: {
      title: 'റോഡ് തടസ്സങ്ങൾ - യാത്രാ മുന്നറിയിപ്പ്',
      immediateActions: [
        'തടസ്സമുള്ള റോഡിലൂടെ മുന്നോട്ട് പോകാൻ ശ്രമിക്കരുത്.',
        'സുരക്ഷിതമായ സ്ഥലത്തേക്ക് വാഹനം തിരിച്ചുവിടുക.',
        'സഹായ ലൈവ് മാപ്പിലെ സേഫ് റൂട്ട് ഉപയോഗിച്ച് സുരക്ഷിതമായ വഴി കണ്ടെത്തുക.'
      ]
    },
    helplines: [
      { name: 'Highway Police Helpline', number: '9846100100' },
      { name: 'District Disaster Control', number: '1077' }
    ]
  },

  RELIEF_ASSISTANCE: {
    disasterType: 'RELIEF_ASSISTANCE',
    title: 'Official Disaster Relief & Compensation Guidance',
    summary: 'Kerala SDRF / CMDRF provides structured financial assistance for damage sustained during recognized disasters.',
    immediateActions: [
      'Document all damages immediately with clear timestamped photographs or video before commencing cleanup.',
      'Submit your application through the SAHAY Relief Fund module under Citizen Dashboard.',
      'Keep your Aadhaar, Ration Card, Land Tax receipt, and active bank passbook (IFSC & Account No) ready.',
      'A revenue field inspector will visit for geotagged damage verification before collector approval.',
      'Track your claim status transparently in real time on the Citizen Dashboard.'
    ],
    doNotDo: [
      'Do NOT submit duplicate or falsified claims; all claims undergo Village Officer & Collector audit.'
    ],
    malayalam: {
      title: 'ദുരിതാശ്വാസ സഹായം - മാർഗ്ഗരേഖ',
      immediateActions: [
        'നാശനഷ്ടങ്ങളുടെ വ്യക്തമായ ഫോട്ടോകൾ എടുത്തുസൂക്ഷിക്കുക.',
        'സഹായ പോർട്ടലിലെ റിലീഫ് ഫണ്ട് മൊഡ്യൂൾ വഴി അപേക്ഷ സമർപ്പിക്കുക.',
        'ആധാർ കാർഡ്, റേഷൻ കാർഡ്, ബാങ്ക് പാസ്ബുക്ക് എന്നിവ കരുതുക.',
        'അപേക്ഷയുടെ സ്ഥിതി Citizen Dashboard വഴി പരിശോധിക്കാവുന്നതാണ്.'
      ]
    },
    helplines: [
      { name: 'Taluk Revenue Office Helpdesk', number: '1077' },
      { name: 'State Disaster Relief Desk', number: '1070' }
    ]
  },

  GENERAL_DISASTER_QUERY: {
    disasterType: 'GENERAL_DISASTER_QUERY',
    title: 'General Disaster Preparedness Guidelines',
    summary: 'Proactive planning and verified information save lives.',
    immediateActions: [
      'Maintain an Emergency Go-Bag with 3 days of water, non-perishable food, first aid, whistle, and documents.',
      'Know the location of your nearest registered government shelter in your panchayat.',
      'Only rely on verified official bulletins from SAHAY, KSDMA, and District Collectorate.',
      'Keep emergency helpline numbers saved on your phone.'
    ],
    doNotDo: [
      'Do NOT forward unverified rumors or social media panic audio messages.'
    ],
    malayalam: {
      title: 'പൊതു ദുരന്ത നിവാരണ മാർഗ്ഗങ്ങൾ',
      immediateActions: [
        'അടിയന്തര കിറ്റ് (ഭക്ഷണം, വെള്ളം, മരുന്നുകൾ, രേഖകൾ) തയ്യാറാക്കി വെക്കുക.',
        'അടുത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പ് എവിടെയാണെന്ന് മുൻകൂട്ടി മനസ്സിലാക്കുക.',
        'ഔദ്യോഗിക അറിയിപ്പുകൾ മാത്രം വിശ്വസിക്കുകയും പിന്തുടരുകയും ചെയ്യുക.'
      ]
    },
    helplines: [
      { name: 'Emergency Police ERSS', number: '112' },
      { name: 'District Disaster Control Room', number: '1077' }
    ]
  }
};

/**
 * Helper to fetch safety rules for a specific disaster type
 */
function getSafetyRules(disasterType = 'GENERAL_DISASTER_QUERY') {
  const normalized = (disasterType || '').toUpperCase().trim();
  return SAFETY_RULES[normalized] || SAFETY_RULES.GENERAL_DISASTER_QUERY;
}

module.exports = {
  SAFETY_RULES,
  getSafetyRules
};
